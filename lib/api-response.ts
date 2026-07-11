
import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

// ── Types ──────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
    requestId?: string
  }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Error codes ────────────────────────────────────────────────────

export const ErrorCodes = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ── Response builders ──────────────────────────────────────────────

export function apiSuccess<T>(data: T, meta?: PaginationMeta, status = 200): NextResponse {
  const body: ApiSuccessResponse<T> = { success: true, data }
  if (meta) body.meta = meta
  return NextResponse.json(body, { status })
}

export function apiError(
  code: ErrorCode,
  message: string,
  details?: unknown,
  status?: number,
  requestId?: string,
): NextResponse {
  const statusMap: Record<string, number> = {
    [ErrorCodes.AUTH_REQUIRED]: 401,
    [ErrorCodes.FORBIDDEN]: 403,
    [ErrorCodes.VALIDATION_ERROR]: 400,
    [ErrorCodes.NOT_FOUND]: 404,
    [ErrorCodes.CONFLICT]: 409,
    [ErrorCodes.RATE_LIMITED]: 429,
    [ErrorCodes.INTERNAL_ERROR]: 500,
    [ErrorCodes.BAD_REQUEST]: 400,
    [ErrorCodes.PAYMENT_FAILED]: 402,
    [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  }

  const httpStatus = status || statusMap[code] || 500

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      // In production, sanitize the message to avoid leaking internal details
      message: config.isProd ? sanitizeErrorMessage(message) : message,
      ...(details && config.isDev ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    },
  }

  return NextResponse.json(body, { status: httpStatus })
}

function sanitizeErrorMessage(message: string): string {
  if (!message) return message
  return message
    .replace(/(?:\/[\w.-]+)+\/[\w.-]+:\d+:\d+/g, '[file]')
    .replace(/\bat [\w.]+ \([^)]*\)/g, '')
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/g, '[mongo-uri]')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 300) // hard cap
}

// ── Convenience wrappers ───────────────────────────────────────────

export function unauthorized(message = 'Authentication required', requestId?: string) {
  return apiError(ErrorCodes.AUTH_REQUIRED, message, undefined, undefined, requestId)
}

export function forbidden(message = 'Insufficient permissions', requestId?: string) {
  return apiError(ErrorCodes.FORBIDDEN, message, undefined, undefined, requestId)
}

export function notFound(resource = 'Resource', requestId?: string) {
  return apiError(ErrorCodes.NOT_FOUND, `${resource} not found`, undefined, undefined, requestId)
}

export function validationError(message: string, details?: unknown, requestId?: string) {
  // Validation error details (field names + messages) are safe to expose in
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    },
  }
  return NextResponse.json(body, { status: 400 })
}

export function badRequest(message: string, requestId?: string) {
  return apiError(ErrorCodes.BAD_REQUEST, message, undefined, undefined, requestId)
}

export function rateLimited(message = 'Too many requests. Try again later.', requestId?: string) {
  return apiError(ErrorCodes.RATE_LIMITED, message, undefined, undefined, requestId)
}

export function withErrorHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = request.headers.get('x-request-id') || undefined
    try {
      return await handler(request)
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        msg: 'unhandled_route_error',
        path: request.nextUrl.pathname,
        method: request.method,
        requestId,
        err: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }))

      if (config.isProd) {
        return apiError(
          ErrorCodes.INTERNAL_ERROR,
          'An internal error occurred. Please try again.',
          undefined,
          500,
          requestId,
        )
      }

      return apiError(
        ErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal server error',
        error instanceof Error ? { stack: error.stack } : undefined,
        500,
        requestId,
      )
    }
  }
}

// ── Paginate helper ────────────────────────────────────────────────

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export function parsePagination(
  params: URLSearchParams | Record<string, string | undefined>,
  maxLimit = 100,
  defaultLimit = 20,
): PaginationParams {
  const raw = params instanceof URLSearchParams
    ? Object.fromEntries(params.entries())
    : params

  let page = parseInt(raw.page || '1', 10)
  let limit = parseInt(raw.limit || String(defaultLimit), 10)

  if (isNaN(page) || page < 1) page = 1
  if (isNaN(limit) || limit < 1) limit = defaultLimit
  if (limit > maxLimit) limit = maxLimit

  return { page, limit, skip: (page - 1) * limit }
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}