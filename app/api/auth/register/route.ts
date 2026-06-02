import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import * as bcryptModule from 'bcryptjs'

// bcryptjs v3 switched to ESM-first — handle both default and namespace exports
const bcrypt = (bcryptModule as any).default || bcryptModule

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { email, phone, password, role, address, firmName, gstin, aadharNumber, farmerName, transporterCompanyName, transporterGstin } = await request.json()

    // Validate required fields
    if (!email || !phone || !password || !role || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email or phone' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await User.create({
      email,
      phone,
      password: hashedPassword,
      role,
      address,
      firmName: role === 'buyer' ? firmName : undefined,
      gstin: role === 'buyer' ? gstin : undefined,
      aadharNumber: role === 'farmer' ? aadharNumber : undefined,
      farmerName: role === 'farmer' ? farmerName : undefined,
      transporterCompanyName: role === 'transporter' ? transporterCompanyName : undefined,
      transporterGstin: role === 'transporter' ? transporterGstin : undefined,
    })

    return NextResponse.json({ success: true, userId: user._id }, { status: 201 })
  } catch (error: unknown) {
    console.error('Registration error:', error)
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
