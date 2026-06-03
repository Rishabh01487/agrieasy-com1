import crypto from 'crypto'
const key = crypto.randomBytes(32).toString('hex')
console.log('\nAdd this to your .env.local and Vercel env vars:\n')
console.log(`ENCRYPTION_KEY=${key}\n`)
