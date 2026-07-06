/**
 * Structured JSON logger powered by Pino.
 *
 * - In development: human-readable via pino-pretty
 * - In production: compact JSON for log aggregators
 * - Every log entry includes `requestId` when available (set via middleware)
 */

import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // Production: compact JSON, redact sensitive fields
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      }),
})

export default logger