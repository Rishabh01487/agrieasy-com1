import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import * as bcryptModule from 'bcryptjs'
import jwt from 'jsonwebtoken'

// bcryptjs v3 switched to ESM-first — handle both default and namespace exports
const bcrypt = (bcryptModule as { default?: typeof bcryptModule }).default || bcryptModule

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { identifier, password } = await request.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, role: user.role },
    })
  } catch (error: unknown) {
    console.error('Login error:', error)
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

