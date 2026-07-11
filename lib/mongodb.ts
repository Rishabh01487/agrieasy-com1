import mongoose from 'mongoose'
import dns from 'dns'

interface CachedConnection {
  conn: typeof import('mongoose') | null
  promise: Promise<typeof import('mongoose')> | null
  lastError: string | null
  consecutiveFailures: number
  circuitOpenUntil: number | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: CachedConnection | undefined
}

let cached = global.mongoose
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, lastError: null, consecutiveFailures: 0, circuitOpenUntil: null }
}

const MAX_POOL_SIZE = parseInt(process.env.MONGODB_POOL_SIZE || '50')
const MIN_POOL_SIZE = 10
const SERVER_SELECTION_TIMEOUT = 10000
const SOCKET_TIMEOUT = 60000
const MAX_RETRIES = 3
const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_RESET_MS = 30000

function isCircuitOpen(): boolean {
  if (!cached?.circuitOpenUntil) return false
  if (Date.now() < cached.circuitOpenUntil) return true
  cached.circuitOpenUntil = null
  cached.consecutiveFailures = 0
  return false
}

function openCircuit() {
  if (cached) {
    cached.consecutiveFailures++
    if (cached.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      cached.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS
      console.error(JSON.stringify({
        level: 'error',
        msg: 'circuit_breaker_open',
        failures: cached.consecutiveFailures,
        resetIn: CIRCUIT_BREAKER_RESET_MS,
      }))
    }
  }
}

function closeCircuit() {
  if (cached && cached.consecutiveFailures > 0) {
    cached.consecutiveFailures = 0
    cached.circuitOpenUntil = null
    cached.lastError = null
  }
}

async function connectWithRetry(uri: string): Promise<typeof import('mongoose')> {
  let lastErr: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const m = await mongoose.connect(uri, {
        bufferCommands: false,
        maxPoolSize: MAX_POOL_SIZE,
        minPoolSize: MIN_POOL_SIZE,
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT,
        socketTimeoutMS: SOCKET_TIMEOUT,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
      })
      m.connection.on('error', (err) => {
        console.error(JSON.stringify({ level: 'error', msg: 'mongo_connection_error', err: String(err) }))
        if (cached) {
          cached.conn = null
          cached.promise = null
          cached.lastError = String(err)
        }
      })
      m.connection.on('disconnected', () => {
        console.warn(JSON.stringify({ level: 'warn', msg: 'mongo_disconnected' }))
        if (cached) {
          cached.conn = null
          cached.promise = null
        }
      })
      m.connection.on('reconnected', () => {
        console.info(JSON.stringify({ level: 'info', msg: 'mongo_reconnected' }))
        closeCircuit()
      })

      closeCircuit()
      return m
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      console.warn(JSON.stringify({
        level: 'warn',
        msg: 'mongo_connect_attempt_failed',
        attempt,
        maxRetries: MAX_RETRIES,
        err: lastErr.message,
      }))

      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  openCircuit()
  throw lastErr || new Error('MongoDB connection failed after all retries')
}

async function dbConnect(): Promise<typeof import('mongoose')> {
  const MONGODB_URI = process.env.MONGODB_URI

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable')
  }

  if (!cached) throw new Error('Cache not initialized')

  if (isCircuitOpen()) {
    throw new Error('Database circuit breaker is open — too many connection failures. Retrying in ' + Math.ceil((cached.circuitOpenUntil! - Date.now()) / 1000) + 's')
  }

  try {
    dns.setDefaultResultOrder('ipv4first')
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
  } catch { /* ignore if already set */ }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    cached.promise = connectWithRetry(MONGODB_URI).then((m) => m)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    cached.lastError = e instanceof Error ? e.message : String(e)
    throw e
  }

  return cached.conn
}

export function getConnectionHealth() {
  return {
    readyState: mongoose.connection.readyState,
    readyStateLabel: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    consecutiveFailures: cached?.consecutiveFailures || 0,
    circuitOpen: isCircuitOpen(),
    circuitResetIn: cached?.circuitOpenUntil ? Math.max(0, cached.circuitOpenUntil - Date.now()) : 0,
    lastError: cached?.lastError || null,
    poolSize: MAX_POOL_SIZE,
  }
}

export function isDatabaseHealthy(): boolean {
  return mongoose.connection.readyState === 1 && !isCircuitOpen()
}

export default dbConnect
