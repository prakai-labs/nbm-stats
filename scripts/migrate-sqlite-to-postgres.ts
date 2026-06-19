// Migration script: SQLite → PostgreSQL
//
// วิธีใช้:
// 1. ตั้งค่า DATABASE_URL (Postgres) ใน .env
// 2. รัน: bunx prisma db push --schema prisma/schema.postgres.prisma
// 3. รัน: bun run scripts/migrate-sqlite-to-postgres.ts
//
// Script นี้จะ:
// - อ่านข้อมูลจาก SQLite เดิม (db/custom.db)
// - ย้ายไปยัง Postgres ผ่าน DATABASE_URL
// - แสดงสรุปจำนวน record ที่ย้าย

import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'

// ใช้ Prisma client สำหรับ Postgres (อ่านจาก DATABASE_URL)
const postgres = new PrismaClient()

// อ่าน SQLite เดิม
const SQLITE_PATH = process.env.SQLITE_PATH || '/home/z/my-project/db/custom.db'
const sqlite = new Database(SQLITE_PATH, { readonly: true })

interface SqliteClassroom {
  id: string
  code: string
  name: string
  level: string
  sortOrder: number
}

interface SqliteAttendanceRecord {
  id: string
  date: string
  classroomId: string
  totalMale: number
  totalFemale: number
  sickMale: number
  sickFemale: number
  leaveMale: number
  leaveFemale: number
  absentMale: number
  absentFemale: number
  presentMale: number
  presentFemale: number
  note: string | null
  recordedBy: string | null
  createdAt: string
  updatedAt: string
}

async function main() {
  console.log('🚀 เริ่ม migration SQLite → Postgres')
  console.log(`📦 Source: ${SQLITE_PATH}`)
  console.log(`🎯 Target: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`)
  console.log()

  // 1. ย้าย Classrooms
  console.log('📋 กำลังย้าย Classrooms...')
  const classrooms = sqlite.prepare('SELECT * FROM Classroom').all() as SqliteClassroom[]
  console.log(`   พบ ${classrooms.length} ห้องเรียน`)

  for (const c of classrooms) {
    await postgres.classroom.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        level: c.level,
        sortOrder: c.sortOrder,
      },
      create: {
        id: c.id,
        code: c.code,
        name: c.name,
        level: c.level,
        sortOrder: c.sortOrder,
      },
    })
  }
  console.log(`   ✅ ย้าย Classrooms สำเร็จ`)

  // 2. ย้าย AttendanceRecords
  console.log('📊 กำลังย้าย AttendanceRecords...')
  const records = sqlite.prepare('SELECT * FROM AttendanceRecord').all() as SqliteAttendanceRecord[]
  console.log(`   พบ ${records.length} records`)

  let success = 0
  let skipped = 0
  for (const r of records) {
    try {
      await postgres.attendanceRecord.upsert({
        where: {
          date_classroomId: {
            date: r.date,
            classroomId: r.classroomId,
          },
        },
        update: {
          totalMale: r.totalMale,
          totalFemale: r.totalFemale,
          sickMale: r.sickMale,
          sickFemale: r.sickFemale,
          leaveMale: r.leaveMale,
          leaveFemale: r.leaveFemale,
          absentMale: r.absentMale,
          absentFemale: r.absentFemale,
          presentMale: r.presentMale,
          presentFemale: r.presentFemale,
          note: r.note,
          recordedBy: r.recordedBy,
        },
        create: {
          id: r.id,
          date: r.date,
          classroomId: r.classroomId,
          totalMale: r.totalMale,
          totalFemale: r.totalFemale,
          sickMale: r.sickMale,
          sickFemale: r.sickFemale,
          leaveMale: r.leaveMale,
          leaveFemale: r.leaveFemale,
          absentMale: r.absentMale,
          absentFemale: r.absentFemale,
          presentMale: r.presentMale,
          presentFemale: r.presentFemale,
          note: r.note,
          recordedBy: r.recordedBy,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        },
      })
      success++
    } catch (err) {
      console.warn(`   ⚠️  ข้าม record ${r.id}: ${(err as Error).message}`)
      skipped++
    }
  }
  console.log(`   ✅ ย้ายสำเร็จ ${success} records, ข้าม ${skipped}`)

  console.log()
  console.log('🎉 Migration เสร็จสิ้น!')
  console.log(`   - Classrooms: ${classrooms.length}`)
  console.log(`   - AttendanceRecords: ${success}/${records.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Migration ล้มเหลว:', e)
    process.exit(1)
  })
  .finally(async () => {
    await postgres.$disconnect()
    sqlite.close()
  })
