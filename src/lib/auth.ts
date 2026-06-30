import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

// กำหนดค่า NextAuth — ใช้ Google OAuth เป็นทางเข้าหลัก
// มี CredentialsProvider สำหรับ Dev Mode (ทดสอบ UI โดยไม่ต้องมี Google OAuth จริง)
// ในโปรดักชันเมื่อตั้งค่า GOOGLE_CLIENT_ID จริง ควรปิด CredentialsProvider

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Dev mode = ยังไม่ได้ตั้งค่า Google OAuth จริง

const DIRECTOR_EMAILS = (process.env.DIRECTOR_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)


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
      // Auto-create UserRole on first login
      const email = (user.email || '').toLowerCase()
      if (email) {
        try {
          // Auto-set admin for owner email
          const defaultRole = email === 'paigalaxzy@gmail.com' ? 'admin' : 'teacher'
          const existing = await db.userRole.findUnique({ where: { email } })
          await db.userRole.upsert({
            where: { email },
            update: { name: user.name || undefined },
            create: { email, name: user.name || null, role: defaultRole },
          })
        } catch { /* ignore if table not ready */ }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.picture = user.image
        const email = (user.email || '').toLowerCase()
        // Check role from UserRole table first, fall back to DIRECTOR_EMAILS
        let role = 'teacher'
        try {
          const userRole = await db.userRole.findUnique({ where: { email } })
          if (userRole) role = userRole.role
        } catch { /* ignore */ }
        if (role === 'teacher' && (isDevMode || DIRECTOR_EMAILS.includes(email))) {
          role = 'director'
        }
        token.role = role
        token.isAdmin = role === 'admin'
        token.isDirector = role === 'director'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.id as string
        ;(session.user as { isDirector?: boolean }).isDirector = token.isDirector as boolean
        ;(session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as boolean
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
