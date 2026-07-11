
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
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      }),
})

export default logger