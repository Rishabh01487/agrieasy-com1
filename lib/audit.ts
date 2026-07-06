import { NextRequest } from 'next/server'
import dbConnect from '@/lib/mongodb'
import AuditLog from '@/lib/models/AuditLog'

interface AuditParams {
  userId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'VIOLATION'
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  request?: NextRequest
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await dbConnect()
    const ip = params.request
      ? params.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || params.request.headers.get('x-real-ip')
        || 'unknown'
      : undefined
    const userAgent = params.request?.headers.get('user-agent') || undefined

    await AuditLog.create({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      ip,
      userAgent,
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}
