import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/calendar?month=YYYY-MM
// ส่งข้อมูลสรุปรายวันของเดือนที่เลือก เพื่อนำไปแสดงเป็นปฏิทินสี
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // YYYY-MM

    let year: number, monthNum: number
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number)
      year = y
      monthNum = m
    } else {
      // default to current Bangkok month
      const now = new Date()
      const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      year = bangkok.getUTCFullYear()
      monthNum = bangkok.getUTCMonth() + 1
    }

    // หาวันแรกและวันสุดท้ายของเดือน
    const firstDay = `${year}-${String(monthNum).padStart(2, '0')}-01`
    const lastDayDate = new Date(Date.UTC(year, monthNum, 0)) // day 0 of next month = last day of current
    const lastDay = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDayDate.getUTCDate()).padStart(2, '0')}`

    const records = await db.attendanceRecord.findMany({
      where: { date: { gte: firstDay, lte: lastDay } },
    })

    // กลุ่มข้อมูลตามวัน
    const byDate = new Map<string, {
      totalMale: number; totalFemale: number;
      presentMale: number; presentFemale: number;
      sickMale: number; sickFemale: number;
      leaveMale: number; leaveFemale: number;
      absentMale: number; absentFemale: number;
      classroomCount: number;
    }>()

    for (const r of records) {
      const cur = byDate.get(r.date) ?? {
        totalMale: 0, totalFemale: 0,
        presentMale: 0, presentFemale: 0,
        sickMale: 0, sickFemale: 0,
        leaveMale: 0, leaveFemale: 0,
        absentMale: 0, absentFemale: 0,
        classroomCount: 0,
      }
      cur.totalMale += r.totalMale
      cur.totalFemale += r.totalFemale
      cur.presentMale += r.presentMale
      cur.presentFemale += r.presentFemale
      cur.sickMale += r.sickMale
      cur.sickFemale += r.sickFemale
      cur.leaveMale += r.leaveMale
      cur.leaveFemale += r.leaveFemale
      cur.absentMale += r.absentMale
      cur.absentFemale += r.absentFemale
      cur.classroomCount += 1
      byDate.set(r.date, cur)
    }

    // แปลงเป็น array พร้อมคำนวณ rate
    const days: Array<{
      date: string
      day: number
      total: number
      present: number
      sick: number
      leave: number
      absent: number
      male: number
      female: number
      presentMale: number
      presentFemale: number
      rate: number
      classroomCount: number
      hasData: boolean
    }> = []

    for (let d = 1; d <= lastDayDate.getUTCDate(); d++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const agg = byDate.get(dateStr)
      const total = agg ? agg.totalMale + agg.totalFemale : 0
      const present = agg ? agg.presentMale + agg.presentFemale : 0
      const sick = agg ? agg.sickMale + agg.sickFemale : 0
      const leave = agg ? agg.leaveMale + agg.leaveFemale : 0
      const absent = agg ? agg.absentMale + agg.absentFemale : 0
      const male = agg?.totalMale ?? 0
      const female = agg?.totalFemale ?? 0
      days.push({
        date: dateStr,
        day: d,
        total,
        present,
        sick,
        leave,
        absent,
        male,
        female,
        presentMale: agg?.presentMale ?? 0,
        presentFemale: agg?.presentFemale ?? 0,
        rate: total > 0 ? (present / total) * 100 : 0,
        classroomCount: agg?.classroomCount ?? 0,
        hasData: !!agg,
      })
    }

    // สรุปรวมเดือน
    const monthSummary = {
      year,
      month: monthNum,
      totalStudents: days.reduce((s, d) => s + d.total, 0),
      present: days.reduce((s, d) => s + d.present, 0),
      sick: days.reduce((s, d) => s + d.sick, 0),
      leave: days.reduce((s, d) => s + d.leave, 0),
      absent: days.reduce((s, d) => s + d.absent, 0),
      male: days.reduce((s, d) => s + d.male, 0),
      female: days.reduce((s, d) => s + d.female, 0),
      recordedDays: days.filter((d) => d.hasData).length,
      totalDays: days.length,
      avgRate:
        days.filter((d) => d.hasData).length > 0
          ? days.filter((d) => d.hasData).reduce((s, d) => s + d.rate, 0) /
            days.filter((d) => d.hasData).length
          : 0,
    }

    return NextResponse.json({ days, monthSummary })
  } catch (error) {
    console.error('Failed to fetch calendar:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 })
  }
}
