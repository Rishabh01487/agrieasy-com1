import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET })
        if (!token?.email) return NextResponse.json({ error: 'No active session' }, { status: 401 })

        await dbConnect()
        const user = await User.findOne({ email: token.email })

        if (!user) {
            return NextResponse.json({ registered: false, email: token.email, name: token.name || '' })
        }

        const jwtSecret = process.env.JWT_SECRET
        if (!jwtSecret || jwtSecret === 'your-secret-key') return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

        const jwtToken = jwt.sign({ userId: user._id.toString(), email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' })

        return NextResponse.json({ registered: true, token: jwtToken, userId: user._id.toString(), role: user.role })
    } catch (error) {
        console.error('Session token error:', error)
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
    }
}
