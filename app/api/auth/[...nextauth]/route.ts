import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET

const providers = hasGoogle
  ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
  : []

const handler = NextAuth({
    providers,
    ...(true ? { trustHost: true as any } : {}),
    session: { strategy: 'jwt' as const, maxAge: 30 * 24 * 60 * 60 },
    callbacks: {
        async jwt({ token, account }) {
            if (account) token.accessToken = account.access_token
            return token
        },
        async session({ session, token }) {
            if (session.user) (session.user as any).id = token.sub
            return session
        },
        async redirect({ url, baseUrl }) {
            const appUrl = baseUrl.replace('/api/auth', '')
            if (url.startsWith('/')) return `${appUrl}${url}`
            if (new URL(url).origin === appUrl) return url
            return appUrl
        },
        async signIn() {
            return true
        },
    },
    pages: { signIn: '/auth/login', error: '/auth/login' },
    secret,
})

export { handler as GET, handler as POST }
