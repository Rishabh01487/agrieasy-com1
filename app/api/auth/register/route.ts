import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { email, phone, password, role, address, firmName, gstin, aadharNumber, farmerName } = await request.json()

    // Validate required fields
    if (!email || !phone || !password || !role || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
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
    })

    return NextResponse.json({ success: true, userId: user._id }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
