import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

// กำหนดค่า NextAuth — ใช้ Google OAuth เป็นทางเข้าหลัก
// มี CredentialsProvider สำหรับ Dev Mode (ทดสอบ UI โดยไม่ต้องมี Google OAuth จริง)
// ในโปรดักชันเมื่อตั้งค่า GOOGLE_CLIENT_ID จริง ควรปิด CredentialsProvider

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Dev mode = ยังไม่ได้ตั้งค่า Google OAuth จริง
const isDevMode =
  !process.env.GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID === 'dev-client-id-placeholder' ||
  process.env.GOOGLE_CLIENT_ID.startsWith('dev-')

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    // Dev mode only — ใช้สำหรับทดสอบ UI
    ...(isDevMode
      ? [
          CredentialsProvider({
            id: 'dev-credentials',
            name: 'ทดสอบ (Dev)',
            credentials: {
              name: { label: 'Name', type: 'text' },
              email: { label: 'Email', type: 'email' },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null
              return {
                id: credentials.email,
                name: credentials.name || 'ครูทดสอบ',
                email: credentials.email,
                image: null,
              }
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      if (ALLOWED_EMAILS.length > 0) {
        const email = (user.email || '').toLowerCase()
        if (!ALLOWED_EMAILS.includes(email)) {
          console.warn(`[auth] Sign-in rejected for ${email} — not in allowed list`)
          return false
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
