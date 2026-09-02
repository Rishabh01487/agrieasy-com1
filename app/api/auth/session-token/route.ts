import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import jwt from 'jsonwebtoken'

/**
 * POST /api/auth/session-token
 *
 * Exchanges a NextAuth session (Google OAuth cookie) for a JWT token
 * that the app's existing API routes understand (Bearer token in
 * Authorization header, stored in localStorage).
 *
 * This bridges Google Sign-In (NextAuth) with the existing phone+password
 * auth system that uses localStorage + Bearer tokens.
 *
 * Body: { email: string }
 * Auth: NextAuth session cookie (sent automatically with credentials: include)
 */
export async function POST(req: NextRequest) {
    try {
        // Get the NextAuth token from the cookie
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET })

        if (!token || !token.email) {
            return NextResponse.json({ error: 'No active NextAuth session' }, { status: 401 })
        }

        await dbConnect()

        // Find the user by email (created during NextAuth signIn callback)
        const user = await User.findOne({ email: token.email })
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Sign a JWT token — same format as the login API
        const secret = process.env.JWT_SECRET
        if (!secret || secret === 'your-secret-key') {
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
        }

        const jwtToken = jwt.sign(
            { userId: user._id.toString(), email: user.email, role: user.role },
            secret,
            { expiresIn: '7d' }
        )

        return NextResponse.json({
            token: jwtToken,
            userId: user._id.toString(),
            role: user.role,
        })
    } catch (error) {
        console.error('Session token error:', error)
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
    }
}
