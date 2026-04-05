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
            // Persist OAuth access_token and profile to the token
            if (account) {
                token.accessToken = account.access_token
                token.id = profile?.sub
            }
            return token
        },
        async session({ session, token }) {
            // Send token properties to the client
            if (session.user) {
                (session.user as { id?: string }).id = token.id as string
            }
            return session
        },
        async redirect({ baseUrl }) {
            return baseUrl
        },
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
