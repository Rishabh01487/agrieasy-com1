import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  // SECURITY: fail-closed — throw with a clear message when the key is
  // missing/malformed. Callers (User/Wallet pre-save setters) no longer
  // catch this, so the error surfaces as a Mongoose ValidationError and
  // blocks the write rather than silently storing plaintext PII.
  if (!key) {
    throw new Error('ENCRYPTION_KEY missing — refusing to store plaintext PII. Generate with: openssl rand -hex 32')
  }
  // SECURITY: AES-256 needs exactly 32 bytes. The env var must be 64 hex
  // chars (lib/config.ts enforces this at boot). Buffer.from(key, 'hex')
  // would silently produce a short buffer for non-hex strings — which is
  // how the previous silent-plaintext-fallback was triggered. Reject
  // explicitly here too so the error message is actionable.
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hex chars (32 bytes) for AES-256-GCM — ' +
      'refusing to store plaintext PII. Generate with: openssl rand -hex 32',
    )
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(text: string): string {
  if (!text) return text
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${tag}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText
  const parts = encryptedText.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted text format')
  const key = getKey()
  const iv = Buffer.from(parts[0], 'hex')
  const tag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
