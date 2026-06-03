const otpStore = new Map<string, { otp: string; expiresAt: number }>()

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function storeOtp(phone: string, otp: string): void {
  otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 })
}

export function verifyOtp(phone: string, otp: string): boolean {
  const record = otpStore.get(phone)
  if (!record) return false
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone)
    return false
  }
  if (record.otp !== otp) return false
  otpStore.delete(phone)
  return true
}

export async function sendSms(phone: string, message: string): Promise<void> {
  console.log(`[SMS to ${phone}]: ${message}`)

  const provider = process.env.SMS_PROVIDER

  if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_PHONE_NUMBER
      if (!from) return
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: from, Body: message }),
      })
    } catch (e) {
      console.error('Twilio SMS error:', e)
    }
    return
  }

  if (provider === 'fast2sms' && process.env.FAST2SMS_API_KEY) {
    try {
      await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          numbers: phone.replace('+91', ''),
          message,
        }),
      })
    } catch (e) {
      console.error('Fast2SMS error:', e)
    }
  }
}
