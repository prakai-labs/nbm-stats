import { PrismaClient } from '@prisma/client'

// ใช้ global singleton เพื่อป้องกันการสร้าง PrismaClient หลายตัวใน dev mode
// (Next.js hot-reload อาจสร้างซ้ำได้)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ปิด log query ใน production เพื่อ performance
const logMode = process.env.NODE_ENV === 'production' ? [] : ['error', 'warn']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logMode as any,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
