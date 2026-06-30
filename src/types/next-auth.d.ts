import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string
      isDirector?: boolean
      isAdmin?: boolean
      role?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    picture?: string | null
    isDirector?: boolean
    isAdmin?: boolean
    role?: string
  }
}
