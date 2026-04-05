import mongoose from 'mongoose'
import dns from 'dns'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface CachedConnection {
  conn: typeof import('mongoose') | null
  promise: Promise<typeof import('mongoose')> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: CachedConnection | undefined
}

let cached = global.mongoose
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (!cached) throw new Error('Cache not initialized')

  // Re-apply Google DNS every call to ensure worker threads use it
  try {
    dns.setDefaultResultOrder('ipv4first')
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
  } catch { /* ignore if already set */ }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    }).then((m) => m)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default dbConnect