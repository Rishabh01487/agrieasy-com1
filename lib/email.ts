import nodemailer from 'nodemailer'

/**
 * Email helper — sends transactional emails via Gmail SMTP (or any SMTP server).
 *
 * Setup (Gmail example):
 *   1. Enable 2-Step Verification: https://myaccount.google.com/security
 *   2. Generate an App Password: https://myaccount.google.com/apppasswords
 *   3. Add to .env.local:
 *        SMTP_HOST=smtp.gmail.com
 *        SMTP_PORT=465
 *        SMTP_USER=your-email@gmail.com
 *        SMTP_PASS=your-16-char-app-password
 *        ADMIN_EMAIL=your-email@gmail.com
 *
 * To disable email alerts entirely, leave SMTP_HOST unset — sendEmail()
 * will silently no-op and just log a warning.
 */

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const port = parseInt(process.env.SMTP_PORT || '465', 10)

  if (!host || !user || !pass) {
    return null  // email not configured — callers should check
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,  // true for 465, false for 587
    auth: { user, pass },
  })

  return transporter
}

export interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

/**
 * Send an email. Returns true on success, false on failure.
 * Silently no-ops if SMTP is not configured.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const t = getTransporter()
  if (!t) {
    console.warn('[email] SMTP not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS to enable email alerts')
    return false
  }

  const from = process.env.SMTP_USER || 'noreply@agrieasy.com'
  const fromName = process.env.SMTP_FROM_NAME || 'AgriEasy Alerts'

  try {
    const info = await t.sendMail({
      from: `"${fromName}" <${from}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text || '',
      html: opts.html || opts.text || '',
    })
    console.log(`[email] Sent to ${opts.to} — messageId=${info.messageId}`)
    return true
  } catch (err) {
    console.error('[email] Send failed:', err instanceof Error ? err.message : String(err))
    return false
  }
}

/**
 * Convenience: send an alert to the configured ADMIN_EMAIL.
 * Returns true if sent, false otherwise.
 */
export async function sendAdminAlert(subject: string, text: string, html?: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.warn('[email] ADMIN_EMAIL not set — skipping alert')
    return false
  }
  return sendEmail({ to: adminEmail, subject, text, html })
}
