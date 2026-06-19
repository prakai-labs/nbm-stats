import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/trends?days=7
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = Number(searchParams.get('days') || 7)

    const now = new Date()
    const dates: string[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }

    const records = await db.attendanceRecord.findMany({
      where: { date: { in: dates } },
    })

    interface DayAgg {
      totalMale: number; totalFemale: number; total: number;
      sickMale: number; sickFemale: number; sick: number;
      leaveMale: number; leaveFemale: number; leave: number;
      absentMale: number; absentFemale: number; absent: number;
      presentMale: number; presentFemale: number; present: number;
    }
    const byDate = new Map<string, DayAgg>()
    for (const r of records) {
      const cur: DayAgg = byDate.get(r.date) ?? {
        totalMale: 0, totalFemale: 0, total: 0,
        sickMale: 0, sickFemale: 0, sick: 0,
        leaveMale: 0, leaveFemale: 0, leave: 0,
        absentMale: 0, absentFemale: 0, absent: 0,
        presentMale: 0, presentFemale: 0, present: 0,
      }
      cur.totalMale += r.totalMale
      cur.totalFemale += r.totalFemale
      cur.total += r.totalMale + r.totalFemale
      cur.sickMale += r.sickMale; cur.sickFemale += r.sickFemale; cur.sick += r.sickMale + r.sickFemale
      cur.leaveMale += r.leaveMale; cur.leaveFemale += r.leaveFemale; cur.leave += r.leaveMale + r.leaveFemale
      cur.absentMale += r.absentMale; cur.absentFemale += r.absentFemale; cur.absent += r.absentMale + r.absentFemale
      cur.presentMale += r.presentMale; cur.presentFemale += r.presentFemale; cur.present += r.presentMale + r.presentFemale
      byDate.set(r.date, cur)
    }

    const trend = dates.map((d) => {
      const v = byDate.get(d)
      return {
        date: d,
        totalMale: v?.totalMale ?? 0,
        totalFemale: v?.totalFemale ?? 0,
        total: v?.total ?? 0,
        sickMale: v?.sickMale ?? 0, sickFemale: v?.sickFemale ?? 0, sick: v?.sick ?? 0,
        leaveMale: v?.leaveMale ?? 0, leaveFemale: v?.leaveFemale ?? 0, leave: v?.leave ?? 0,
        absentMale: v?.absentMale ?? 0, absentFemale: v?.absentFemale ?? 0, absent: v?.absent ?? 0,
        presentMale: v?.presentMale ?? 0, presentFemale: v?.presentFemale ?? 0, present: v?.present ?? 0,
      }
    })

    return NextResponse.json({ trend })
  } catch (error) {
    console.error('Failed to fetch trends:', error)
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 })
  }
}
