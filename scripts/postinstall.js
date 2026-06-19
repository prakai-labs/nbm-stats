// สคริปต์นี้รันหลัง install บน Vercel เพื่อ:
// 1. คัดลอก prisma/schema.postgres.prisma ไปเป็น prisma/schema.prisma หลัก (เพราะ Vercel ใช้ Postgres)
// 2. Generate Prisma client สำหรับ Postgres
//
// ในเครื่อง dev ที่ใช้ SQLite: schema.prisma หลักยังเป็น SQLite อยู่ (ไม่ต้องรัน script นี้)
// ใน Vercel: Vercel จะรัน postinstall script อัตโนมัติ

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const isVercel = !!process.env.VERCEL
const dbUrl = process.env.DATABASE_URL || ''
const usePostgres = isVercel || dbUrl.startsWith('postgres')

if (usePostgres) {
  console.log('🔧 Detected Postgres environment — switching Prisma schema...')
  const source = path.join(__dirname, '..', 'prisma', 'schema.postgres.prisma')
  const target = path.join(__dirname, '..', 'prisma', 'schema.prisma')
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target)
    console.log('   ✅ Copied schema.postgres.prisma → schema.prisma')
  } else {
    console.warn(`   ⚠️  Source schema not found: ${source}`)
  }
  // Generate Prisma client
  try {
    execSync('bunx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
    console.log('   ✅ Prisma client generated for Postgres')
  } catch (err) {
    console.error('   ❌ Prisma generate failed:', err.message)
    process.exit(1)
  }
} else {
  console.log('📦 SQLite environment detected — keeping default schema.prisma')
}
