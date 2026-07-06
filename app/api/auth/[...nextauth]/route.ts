import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account) {
                token.accessToken = account.access_token
                token.id = profile?.sub
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { id?: string }).id = token.id as string
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            if (url.startsWith('/')) return `${baseUrl}${url}`
            else if (new URL(url).origin === baseUrl) return url
            return baseUrl
        },
        async signIn({ account, profile }) {
            if (account?.provider === 'google' && profile?.email) {
                const dbConnect = (await import('@/lib/mongodb')).default
                const bcrypt = (await import('bcryptjs')).default
                const User = (await import('@/lib/models/User')).default
                await dbConnect()
                const existingUser = await User.findOne({ email: profile.email })
                if (!existingUser) {
                    const crypto = await import('crypto')
                    const randomPassword = crypto.randomBytes(32).toString('hex')
                    await User.create({
                        email: profile.email,
                        phone: (profile as Record<string, unknown>).phone_number as string || '',
                        password: await bcrypt.hash(randomPassword, 10),
                        role: 'buyer',
                        address: '',
                        firmName: profile.name || '',
                    })
                }
            }
            return true
        },
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }