import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import * as bcryptModule from 'bcryptjs'
import { validateAadhar, validatePhone, validateGstin } from '@/lib/validators'
import { logAudit } from '@/lib/audit'
import { rateLimitByIp } from '@/lib/rate-limit'

const bcrypt = (bcryptModule as any).default || bcryptModule

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitByIp(request, { windowMs: 60_000, max: 3, message: 'Too many registration attempts. Try again later.' })
    if (rl) return rl

    await dbConnect()
    const { email, phone, password, role, address, firmName, gstin, aadharNumber, farmerName, transporterCompanyName, transporterGstin } = await request.json()

    if (!email || !phone || !password || !role || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const phoneCheck = validatePhone(phone)
    if (!phoneCheck.valid) return NextResponse.json({ error: phoneCheck.message }, { status: 400 })

    if (role === 'farmer') {
      if (!aadharNumber) return NextResponse.json({ error: 'Aadhar number required for farmers' }, { status: 400 })
      if (!farmerName) return NextResponse.json({ error: 'Farmer name required' }, { status: 400 })
      const aadharCheck = validateAadhar(aadharNumber)
      if (!aadharCheck.valid) return NextResponse.json({ error: aadharCheck.message }, { status: 400 })
    }

    if (role === 'buyer') {
      if (gstin) {
        const gstinCheck = validateGstin(gstin)
        if (!gstinCheck.valid) return NextResponse.json({ error: gstinCheck.message }, { status: 400 })
      }
    }

    if (role === 'transporter') {
      if (gstin) {
        const gstinCheck = validateGstin(gstin)
        if (!gstinCheck.valid) return NextResponse.json({ error: gstinCheck.message }, { status: 400 })
      }
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email or phone' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      email, phone, password: hashedPassword, role, address,
      firmName: role === 'buyer' ? firmName : undefined,
      gstin: role === 'buyer' ? gstin : undefined,
      aadharNumber: role === 'farmer' ? aadharNumber : undefined,
      farmerName: role === 'farmer' ? farmerName : undefined,
      transporterCompanyName: role === 'transporter' ? transporterCompanyName : undefined,
      transporterGstin: role === 'transporter' ? transporterGstin : undefined,
    })

    await logAudit({ userId: user._id.toString(), action: 'CREATE', resource: 'User', resourceId: user._id.toString(), details: { role, email }, request })

    return NextResponse.json({ success: true, userId: user._id }, { status: 201 })
  } catch (error: unknown) {
    console.error('Registration error:', error)
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
