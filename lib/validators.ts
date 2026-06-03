// ─── Aadhar (12 digits + Verhoeff checksum) ───
const VERHOEFF_D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
]
const VERHOEFF_P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
]
const VERHOEFF_INV = [0,4,3,2,1,5,6,7,8,9]

function verhoeffCheck(digits: number[]): boolean {
  let c = 0
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[(i % 8)][digits[digits.length - 1 - i]]]
  }
  return c === 0
}

export function validateAadhar(aadhar: string): { valid: boolean; message: string } {
  if (!aadhar) return { valid: false, message: 'Aadhar number is required' }
  const cleaned = aadhar.replace(/\s/g, '')
  if (!/^\d{12}$/.test(cleaned)) return { valid: false, message: 'Aadhar must be exactly 12 digits' }
  if (!verhoeffCheck(cleaned.split('').map(Number))) return { valid: false, message: 'Aadhar number is invalid (checksum failed)' }
  return { valid: true, message: '' }
}

// ─── Driving License (state-code format) ───
const DL_REGEX = /^[A-Z]{2}\d{2}[0-9]{2}[0-9]{7}$/
const STATE_CODES = ['AP','AR','AS','BR','CG','GA','GJ','HR','HP','JK','JH','KA','KL','LA','LD','MP','MH','MN','ML','MZ','NL','OD','PB','RJ','SK','TN','TS','TR','UP','UK','WB','AN','CH','DN','DD','DL','PY']

export function validateDrivingLicense(license: string): { valid: boolean; message: string } {
  if (!license) return { valid: false, message: 'License number is required' }
  const cleaned = license.toUpperCase().replace(/\s/g, '')
  if (!DL_REGEX.test(cleaned)) return { valid: false, message: 'Invalid format. Expected e.g. MH14201234567 (2-letter state + 2-digit RTO + 7 digits)' }
  const stateCode = cleaned.slice(0, 2)
  if (!STATE_CODES.includes(stateCode)) return { valid: false, message: `Invalid state code "${stateCode}". Must be a valid Indian state/UT code` }
  return { valid: true, message: '' }
}

// ─── UPI ID ───
export function validateUpiId(upi: string): { valid: boolean; message: string } {
  if (!upi) return { valid: false, message: 'UPI ID is required' }
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upi)) return { valid: false, message: 'Invalid UPI ID format. Expected e.g. username@paytm or name@oksbi' }
  if (upi.length > 50) return { valid: false, message: 'UPI ID too long (max 50 characters)' }
  return { valid: true, message: '' }
}

// ─── GSTIN (15 chars: 2-state + 10-PAN + 1-entity + 1-blank + 1-check) ───
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/

export function validateGstin(gstin: string): { valid: boolean; message: string } {
  if (!gstin) return { valid: false, message: 'GSTIN is required' }
  const cleaned = gstin.toUpperCase().replace(/\s/g, '')
  if (!GSTIN_REGEX.test(cleaned)) return { valid: false, message: 'Invalid GSTIN format. Expected 15 characters (e.g. 27AAJPL1234D1Z9)' }
  return { valid: true, message: '' }
}

// ─── PAN (10 chars) ───
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]{1}$/

export function validatePan(pan: string): { valid: boolean; message: string } {
  if (!pan) return { valid: false, message: 'PAN is required' }
  const cleaned = pan.toUpperCase().replace(/\s/g, '')
  if (!PAN_REGEX.test(cleaned)) return { valid: false, message: 'Invalid PAN format. Expected e.g. AAAPL1234C' }
  return { valid: true, message: '' }
}

// ─── Phone (India: 10 digits) ───
export function validatePhone(phone: string): { valid: boolean; message: string } {
  if (!phone) return { valid: false, message: 'Phone number is required' }
  const cleaned = phone.replace(/[+\s-]/g, '')
  if (cleaned.startsWith('91')) return cleaned.length === 12 ? { valid: true, message: '' } : { valid: false, message: 'Invalid phone (with 91 code, should be 12 digits)' }
  if (!/^\d{10}$/.test(cleaned)) return { valid: false, message: 'Phone must be 10 digits' }
  if (!/^[6-9]/.test(cleaned)) return { valid: false, message: 'Indian mobile numbers start with 6-9' }
  return { valid: true, message: '' }
}

// ─── PIN / ZIP ───
export function validatePinCode(pin: string): { valid: boolean; message: string } {
  if (!pin) return { valid: false, message: 'PIN code is required' }
  if (!/^\d{6}$/.test(pin)) return { valid: false, message: 'PIN code must be 6 digits' }
  return { valid: true, message: '' }
}
