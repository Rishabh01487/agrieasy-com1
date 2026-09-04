/**
 * End-to-end verification of registration + login flow.
 * Uses mongodb-memory-server so we don't need a real MongoDB instance.
 */

// Set env BEFORE importing any module that reads process.env
Object.assign(process.env, {
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  JWT_SECRET: 'test-jwt-secret-for-verification-32-chars',
  NEXTAUTH_SECRET: 'test-nextauth-secret-for-verification',
  NODE_ENV: 'development',
  APP_URL: 'http://localhost:3000',
})

let mongoServer: any

async function setupDb() {
  const { MongoMemoryServer } = await import('mongodb-memory-server')
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  process.env.MONGODB_URI = uri
  console.log('✓ In-memory MongoDB started at', uri)
  const mongoose = (await import('mongoose')).default
  const dbConnect = (await import('../lib/mongodb')).default
  await dbConnect()
  console.log('✓ Mongoose connected')
  const User = (await import('../lib/models/User')).default
  await User.createIndexes()
  console.log('✓ User indexes created')
}

// ── Generate a valid 12-digit Aadhar (passes Verhoeff checksum) ────
async function generateValidAadhar(base11: string): Promise<string> {
  const { validateAadhar } = await import('../lib/validators')
  for (let i = 0; i <= 9; i++) {
    const candidate = base11 + i.toString()
    if (validateAadhar(candidate).valid) return candidate
  }
  throw new Error(`No valid Aadhar check digit found for base ${base11}`)
}

let ipCounter = 0
function makeReq(body: any): any {
  ipCounter++
  const fakeIp = `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`
  return {
    method: 'POST',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'x-forwarded-for') return fakeIp
        if (name.toLowerCase() === 'x-real-ip') return fakeIp
        if (name.toLowerCase() === 'content-type') return 'application/json'
        return null
      },
    },
    json: async () => body,
    nextUrl: { pathname: '/api/auth/register' },
    cookies: {},
  } as any
}

async function parseResponse(res: any) {
  const status = res.status
  const body = await res.json()
  return { status, body }
}

let pass = 0, fail = 0
function assert(cond: boolean, msg: string, extra?: any) {
  if (cond) {
    console.log(`  ✓ ${msg}`)
    pass++
  } else {
    console.error(`  ✗ ${msg}`, extra !== undefined ? JSON.stringify(extra) : '')
    fail++
  }
}

async function testManualFarmerValid(VALID_AADHAR: string) {
  console.log('\n[1] Manual farmer registration — valid data (password + Aadhar + address)')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'Arjun Singh',
    email: 'arjun@test.com',
    phone: '9876543210',
    password: 'StrongPass123',
    role: 'farmer',
    address: 'Village Rampur, Dist. Lucknow, UP',
    aadhaarNumber: VALID_AADHAR,
    isGoogleUser: false,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 201, `Should return 201 (got ${status})`, json)
  assert(json?.success === true, 'Should return success:true', json)
  assert(!!json?.data?.userId, 'Should return a userId', json)
  // Verify address was saved
  const User = (await import('../lib/models/User')).default
  const saved = await User.findOne({ email: 'arjun@test.com' })
  assert(saved?.address === 'Village Rampur, Dist. Lucknow, UP', 'Address should be saved', saved?.address)
  assert(saved?.aadharNumber === VALID_AADHAR, 'Aadhar should be saved', saved?.aadharNumber)
}

async function testManualFarmerWeakPassword() {
  console.log('\n[2] Manual farmer with weak password (no uppercase) → 400')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'Weak Pass',
    email: 'weak@test.com',
    phone: '9876500001',
    password: 'alllowercase123',
    role: 'farmer',
    address: 'Some address line',
    aadhaarNumber: '234123412346',
    isGoogleUser: false,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 400, `Should return 400 (got ${status})`, json)
  assert(json?.error?.message?.includes('Invalid registration data'), 'Should mention validation', json)
}

async function testManualFarmerNoAadhar() {
  console.log('\n[3] Manual farmer without Aadhar → 400')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'No Aadhar',
    email: 'noadhar@test.com',
    phone: '9876500002',
    password: 'StrongPass123',
    role: 'farmer',
    address: 'Some address line',
    isGoogleUser: false,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 400, `Should return 400 (got ${status})`, json)
  const msg = json?.error?.message || ''
  assert(msg.toLowerCase().includes('aadhar'), `Error should mention Aadhar (got "${msg}")`, json)
}

async function testManualUserNoAddress() {
  console.log('\n[4] Manual user without address → 400 (address required for manual)')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'No Address',
    email: 'noaddr@test.com',
    phone: '9876500006',
    password: 'StrongPass123',
    role: 'buyer',
    address: '',
    firmName: 'No Address Firm',
    gstin: '22AAAAA0000A1Z5',
    isGoogleUser: false,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 400, `Should return 400 (got ${status})`, json)
  const msg = json?.error?.message || ''
  assert(msg.toLowerCase().includes('address'), `Error should mention address (got "${msg}")`, json)
}

async function testGoogleUserNoPasswordNoAddress() {
  console.log('\n[5] Google user — no password, no Aadhar, no address → 201')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'Google User',
    email: 'googleuser@test.com',
    phone: '9876500003',
    role: 'farmer',
    address: '',
    isGoogleUser: true,
    // NO password, NO Aadhar, NO address — Google flow should still work
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 201, `Should return 201 (got ${status})`, json)
  assert(json?.success === true, 'Should return success:true', json)
  const User = (await import('../lib/models/User')).default
  const saved = await User.findOne({ email: 'googleuser@test.com' })
  assert(!!saved, 'User should be saved in DB')
  assert(!!saved.password, 'Saved user should have a password hash')
  assert(!saved.password.startsWith('google_oauth_'), 'Password should be hashed, not plaintext')
  assert(saved.address === '' || saved.address == null, 'Address should be empty for Google user', saved.address)
  assert(!saved.aadharNumber, 'Aadhar should be empty for Google farmer', saved.aadharNumber)
}

async function testGoogleBuyerNoAddress() {
  console.log('\n[6] Google buyer — no address → 201 (address optional for Google)')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'Google Buyer',
    email: 'gbuyer@test.com',
    phone: '9876500007',
    role: 'buyer',
    address: '',
    firmName: 'Google Buyer Firm',
    gstin: '22AAAAA0000A1Z5',
    isGoogleUser: true,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 201, `Should return 201 (got ${status})`, json)
  assert(json?.success === true, 'Should return success:true', json)
}

async function testGoogleTransporterNoAddress() {
  console.log('\n[7] Google transporter — no address → 201')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'Google Transporter',
    email: 'gtransporter@test.com',
    phone: '9876500008',
    role: 'transporter',
    address: '',
    companyName: 'GT Co.',
    isGoogleUser: true,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 201, `Should return 201 (got ${status})`, json)
  assert(json?.success === true, 'Should return success:true', json)
}

async function testGoogleUserLegacyPassword() {
  console.log('\n[8] Google user with legacy lowercase password → 201 (server fixes it)')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'Legacy Google',
    email: 'legacy@test.com',
    phone: '9876500004',
    password: 'google_oauth_abc1234567890',
    role: 'buyer',
    address: '',
    firmName: 'Legacy Firm',
    gstin: '22AAAAA0000A1Z5',
    isGoogleUser: true,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 201, `Should return 201 (got ${status})`, json)
  assert(json?.success === true, 'Should return success:true', json)
  const User = (await import('../lib/models/User')).default
  const saved = await User.findOne({ email: 'legacy@test.com' })
  assert(!!saved, 'User should be saved')
  assert(saved.password !== 'google_oauth_abc1234567890', 'Stored password should be hashed')
}

async function testDuplicateEmail() {
  console.log('\n[9] Duplicate email → 400')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'Duplicate User',
    email: 'arjun@test.com', // already registered in test 1
    phone: '9999900001',
    password: 'StrongPass123',
    role: 'buyer',
    address: 'Some address',
    firmName: 'Dup Firm',
    gstin: '22AAAAA0000A1Z5',
    isGoogleUser: false,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 400, `Should return 400 (got ${status})`, json)
  const msg = json?.error?.message || ''
  assert(msg.toLowerCase().includes('already exists'), `Error should mention "already exists" (got "${msg}")`, json)
}

async function testBuyerNoFirmName() {
  console.log('\n[10] Buyer without firmName → 400')
  const { POST } = await import('../app/api/auth/register/route')
  const body = {
    name: 'Buyer No Firm',
    email: 'nofirm@test.com',
    phone: '9999900002',
    password: 'StrongPass123',
    role: 'buyer',
    address: 'Some address',
    isGoogleUser: false,
  }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 400, `Should return 400 (got ${status})`, json)
  const msg = json?.error?.message || ''
  assert(msg.toLowerCase().includes('firm name'), `Error should mention "firm name" (got "${msg}")`, json)
}

async function testLoginValidEmail() {
  console.log('\n[11] Login with valid email + password → 200 + token')
  const { POST } = await import('../app/api/auth/login/route')
  const body = { phone: 'arjun@test.com', password: 'StrongPass123' }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 200, `Should return 200 (got ${status})`, json)
  assert(json?.success === true, 'Should return success:true', json)
  assert(!!json?.data?.token, 'Should return a JWT token', json)
  assert(json?.data?.user?.id, 'Should return user.id', json)
  assert(json?.data?.user?.email === 'arjun@test.com', 'Should return correct email', json)
  assert(json?.data?.user?.role === 'farmer', 'Should return correct role', json)
}

async function testLoginValidPhone() {
  console.log('\n[12] Login with valid phone + password → 200 + token')
  const { POST } = await import('../app/api/auth/login/route')
  const body = { phone: '9876543210', password: 'StrongPass123' }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 200, `Should return 200 (got ${status})`, json)
  assert(json?.data?.user?.email === 'arjun@test.com', 'Should find same user by phone', json)
}

async function testLoginWrongPassword() {
  console.log('\n[13] Login with wrong password → 401')
  const { POST } = await import('../app/api/auth/login/route')
  const body = { phone: 'arjun@test.com', password: 'WrongPassword123' }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 401, `Should return 401 (got ${status})`, json)
}

async function testLoginNonExistent() {
  console.log('\n[14] Login with non-existent user → 401')
  const { POST } = await import('../app/api/auth/login/route')
  const body = { phone: 'noexist@test.com', password: 'StrongPass123' }
  const res = await POST(makeReq(body))
  const { status, body: json } = await parseResponse(res)
  assert(status === 401, `Should return 401 (got ${status})`, json)
}

async function testJwtPayload() {
  console.log('\n[15] Verify token is a valid JWT with correct payload')
  const jwt = (await import('jsonwebtoken')).default
  const { POST } = await import('../app/api/auth/login/route')
  const body = { phone: 'arjun@test.com', password: 'StrongPass123' }
  const res = await POST(makeReq(body))
  const { body: json } = await parseResponse(res)
  const token = json?.data?.token
  assert(!!token, 'Token should be present')
  if (token) {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    assert(!!decoded.userId, 'Decoded token should have userId', decoded)
    assert(decoded.email === 'arjun@test.com', 'Decoded email should match', decoded)
    assert(decoded.role === 'farmer', 'Decoded role should match', decoded)
    assert(decoded.exp && decoded.exp > Date.now() / 1000, 'Token should not be expired', decoded)
  }
}

async function testGoogleUserCanLogin() {
  console.log('\n[16] Google user account exists & cannot login with wrong password')
  const User = (await import('../lib/models/User')).default
  const user = await User.findOne({ email: 'googleuser@test.com' })
  assert(!!user, 'Google user should exist in DB')
  assert(!!user.password, 'Google user should have a (hashed) password for schema compliance')
  const { POST } = await import('../app/api/auth/login/route')
  const res = await POST(makeReq({ phone: 'googleuser@test.com', password: 'wrongpass123' }))
  const { status } = await parseResponse(res)
  assert(status === 401, 'Login with wrong password should fail (401)')
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  AgriEasy Registration + Login End-to-End Verification')
  console.log('═══════════════════════════════════════════════════════════════')

  await setupDb()

  const VALID_AADHAR = await generateValidAadhar('23412341234')
  console.log(`\n  Using valid Aadhar: ${VALID_AADHAR}`)

  await testManualFarmerValid(VALID_AADHAR)
  await testManualFarmerWeakPassword()
  await testManualFarmerNoAadhar()
  await testManualUserNoAddress()
  await testGoogleUserNoPasswordNoAddress()
  await testGoogleBuyerNoAddress()
  await testGoogleTransporterNoAddress()
  await testGoogleUserLegacyPassword()
  await testDuplicateEmail()
  await testBuyerNoFirmName()
  await testLoginValidEmail()
  await testLoginValidPhone()
  await testLoginWrongPassword()
  await testLoginNonExistent()
  await testJwtPayload()
  await testGoogleUserCanLogin()

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(`  Results: ${pass} passed, ${fail} failed`)
  console.log('═══════════════════════════════════════════════════════════════')

  const mongoose = (await import('mongoose')).default
  await mongoose.disconnect()
  if (mongoServer) await mongoServer.stop()

  if (fail > 0) {
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed — registration + login flow is working correctly.')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
