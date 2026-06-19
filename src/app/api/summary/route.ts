import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/summary?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    let targetDate = date
    if (!targetDate) {
      const now = new Date()
      const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      targetDate = bangkok.toISOString().slice(0, 10)
    }

    const records = await db.attendanceRecord.findMany({
      where: { date: targetDate },
      include: { classroom: true },
    })

    const summary = {
      date: targetDate,
      totalMale: records.reduce((s, r) => s + r.totalMale, 0),
      totalFemale: records.reduce((s, r) => s + r.totalFemale, 0),
      totalStudents: records.reduce((s, r) => s + r.totalMale + r.totalFemale, 0),
      sickMale: records.reduce((s, r) => s + r.sickMale, 0),
      sickFemale: records.reduce((s, r) => s + r.sickFemale, 0),
      sick: records.reduce((s, r) => s + r.sickMale + r.sickFemale, 0),
      leaveMale: records.reduce((s, r) => s + r.leaveMale, 0),
      leaveFemale: records.reduce((s, r) => s + r.leaveFemale, 0),
      leave: records.reduce((s, r) => s + r.leaveMale + r.leaveFemale, 0),
      absentMale: records.reduce((s, r) => s + r.absentMale, 0),
      absentFemale: records.reduce((s, r) => s + r.absentFemale, 0),
      absent: records.reduce((s, r) => s + r.absentMale + r.absentFemale, 0),
      presentMale: records.reduce((s, r) => s + r.presentMale, 0),
      presentFemale: records.reduce((s, r) => s + r.presentFemale, 0),
      present: records.reduce((s, r) => s + r.presentMale + r.presentFemale, 0),
      classroomCount: records.length,
      recordedCount: records.length,
    }

    return NextResponse.json({ summary, records })
  } catch (error) {
    console.error('Failed to fetch summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
