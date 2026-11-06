import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { validEnrollmentChange } from '@/lib/enrollment-counts'
import { enrollmentKey } from '@/lib/enrollment-server'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { classroomId, effectiveDate, male, female } = await req.json()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    if (typeof classroomId !== 'string' || typeof effectiveDate !== 'string' || !validEnrollmentChange(effectiveDate, male, female, today)) {
      return NextResponse.json({ error: 'กรุณาระบุวันที่ไม่เกินวันนี้ และจำนวนเต็มตั้งแต่ 0 ขึ้นไป' }, { status: 400 })
    }
    await db.$transaction(async tx => {
      const classroom = await tx.classroom.findUnique({ where: { id: classroomId } })
      if (!classroom) throw new Error('ไม่พบชั้นเรียน')
      const key = enrollmentKey(classroomId, effectiveDate)
      await tx.systemSetting.upsert({ where: { key }, create: { key, value: JSON.stringify({ male, female }) }, update: { value: JSON.stringify({ male, female }) } })
      const latest = await tx.systemSetting.findFirst({ where: { key: { startsWith: `enrollment_count:${classroomId}:`, lte: enrollmentKey(classroomId, today) } }, orderBy: { key: 'desc' } })
      if (!latest) throw new Error('ไม่พบจำนวนล่าสุด')
      const count = JSON.parse(latest.value) as { male: number; female: number }
      await tx.classroom.update({ where: { id: classroomId }, data: { defaultMale: count.male, defaultFemale: count.female } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save classroom counts', error)
    return NextResponse.json({ error: 'บันทึกไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่' }, { status: 500 })
  }
}
