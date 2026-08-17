/**
 * Test script — sends a real PWA install alert email to verify the SMTP config.
 * Run: node scripts/test-email-alert.mjs
 *
 * This bypasses the HTTP layer and calls nodemailer directly,
 * so we don't need the dev server running.
 *
 * Loads env vars from .env.local manually (since we're not running inside Next.js).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')

// Parse .env.local manually (since we're not running inside Next.js)
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const value = trimmed.slice(eqIdx + 1).trim()
  if (!process.env[key]) process.env[key] = value
}

// Verify required env vars are present
const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'ADMIN_EMAIL']
const missing = required.filter(k => !process.env[k])
if (missing.length > 0) {
  console.error('❌ Missing required env vars:', missing.join(', '))
  console.error('   Add them to .env.local')
  process.exit(1)
}

console.log('SMTP config:')
console.log('  Host:', process.env.SMTP_HOST)
console.log('  Port:', process.env.SMTP_PORT || '465')
console.log('  User:', process.env.SMTP_USER)
console.log('  Admin:', process.env.ADMIN_EMAIL)
console.log('')

// Now dynamically import nodemailer (it's in the project's node_modules)
const nodemailerPath = path.join(__dirname, '..', 'node_modules', 'nodemailer', 'lib', 'nodemailer.js')

const nodemailer = await import('file://' + nodemailerPath)

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: (parseInt(process.env.SMTP_PORT || '465', 10)) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const subject = '🎉 AgriEasy PWA installed — Install #1 (TEST)'
const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="background: linear-gradient(135deg, #AC3B61 0%, #123C69 100%); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 700;">🎉 New PWA Install! (TEST)</h1>
      <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Install #1 · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
    </div>
    <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
      <table style="width: 100%; font-size: 14px; color: #1f2937;">
        <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Platform</td><td style="padding: 6px 0; font-weight: 600;">📱 Android</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Language</td><td style="padding: 6px 0;">en-IN</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">IP address</td><td style="padding: 6px 0; font-family: monospace; font-size: 13px;">127.0.0.1 (test)</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Logged-in user</td><td style="padding: 6px 0;">not logged in</td></tr>
      </table>
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f3f4f6;">
        <p style="font-size: 12px; color: #6b7280; margin: 0;">This is a test email from <code>scripts/test-email-alert.mjs</code>. If you received this, your SMTP config is working ✅</p>
      </div>
    </div>
    <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">AgriEasy Alerts · you received this because ADMIN_EMAIL is set</p>
  </div>
`

console.log('Sending test email...')
console.log('')

try {
  const info = await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'AgriEasy Alerts'}" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject,
    html,
  })

  console.log('━'.repeat(60))
  console.log('✅ EMAIL SENT SUCCESSFULLY!')
  console.log(`   To:      ${process.env.ADMIN_EMAIL}`)
  console.log(`   Subject: ${subject}`)
  console.log(`   Message ID: ${info.messageId}`)
  console.log(`   Response: ${info.response}`)
  console.log('')
  console.log('   Check your inbox in ~30 seconds.')
  console.log('   (Also check Spam / Promotions if not in Primary)')
  console.log('━'.repeat(60))
  process.exit(0)
} catch (err) {
  console.log('━'.repeat(60))
  console.log('❌ EMAIL SEND FAILED')
  console.log('   Error:', err.message)
  console.log('   Code:', err.code || '(none)')
  console.log('')
  console.log('   Common fixes:')
  console.log('   - Check that 2-Step Verification is enabled on your Google account')
  console.log('   - Verify the app password is 16 chars, no spaces')
  console.log('   - Make sure SMTP_USER matches the account that generated the password')
  console.log('━'.repeat(60))
  process.exit(1)
}
