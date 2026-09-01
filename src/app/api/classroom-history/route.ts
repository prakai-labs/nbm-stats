import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isHoliday } from '@/lib/holidays'

// GET /api/classroom-history?classroomId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const classroomId = searchParams.get('classroomId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId is required' }, { status: 400 })
    }

    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    // Fetch semester settings to check holiday / term range
    let semesterData: any = null
    try {
      const setting = await db.systemSetting.findUnique({
        where: { key: 'semester_settings' },
      })
      if (setting) {
        semesterData = JSON.parse(setting.value)
      }
    } catch (e) {
      console.error('Error reading semester settings:', e)
    }

    const whereClause: any = { classroomId }
    if (from || to) {
      whereClause.date = {}
      if (from) whereClause.date.gte = from
      if (to) whereClause.date.lte = to
    }

    const records = await db.attendanceRecord.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        classroom: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
            defaultMale: true,
            defaultFemale: true,
          }
        }
      }
    })

    const recordMap = new Map<string, typeof records[0]>()
    for (const r of records) {
      recordMap.set(r.date, r)
    }

    // Today in Bangkok (YYYY-MM-DD)
    const now = new Date()
    const bangkokNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    const todayStr = bangkokNow.toISOString().slice(0, 10)

    // Generate list of all school days in [from, min(to, today)]
    const entriesMap = new Map<string, {
      date: string
      hasRecord: boolean
      record: typeof records[0] | null
    }>()

    // Add all existing records first
    for (const r of records) {
      entriesMap.set(r.date, {
        date: r.date,
        hasRecord: true,
        record: r,
      })
    }

    // Helper: is date within semester terms?
    const isWithinTerm = (dateStr: string) => {
      if (!semesterData) return true
      const hasTerm1 = semesterData.term1?.start && semesterData.term1?.end
      const hasTerm2 = semesterData.term2?.start && semesterData.term2?.end
      if (!hasTerm1 && !hasTerm2) return true

      const cur = new Date(dateStr)
      cur.setHours(0, 0, 0, 0)

      if (hasTerm1) {
        const s1 = new Date(semesterData.term1.start)
        const e1 = new Date(semesterData.term1.end)
        s1.setHours(0, 0, 0, 0)
        e1.setHours(23, 59, 59, 999)
        if (cur >= s1 && cur <= e1) return true
      }
      if (hasTerm2) {
        const s2 = new Date(semesterData.term2.start)
        const e2 = new Date(semesterData.term2.end)
        s2.setHours(0, 0, 0, 0)
        e2.setHours(23, 59, 59, 999)
        if (cur >= s2 && cur <= e2) return true
      }
      return false
    }

    if (from && to) {
      const startDate = new Date(from)
      const endDate = new Date(to < todayStr ? to : todayStr)

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getUTCDay() // 0 = Sun, 6 = Sat
        const dateStr = d.toISOString().slice(0, 10)

        // Only Mon-Fri
        if (dayOfWeek === 0 || dayOfWeek === 6) continue

        // Skip official holidays
        if (isHoliday(dateStr)) continue

        // Skip school vacation if defined
        if (!isWithinTerm(dateStr)) continue

        if (!entriesMap.has(dateStr)) {
          entriesMap.set(dateStr, {
            date: dateStr,
            hasRecord: false,
            record: null,
          })
        }
      }
    }

    // Sort entries by date descending (latest first)
    const entries = Array.from(entriesMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1))

    const unrecordedDates = entries.filter(e => !e.hasRecord).map(e => e.date)

    // Compute summary metrics (only from recorded items)
    let totalMale = 0
    let totalFemale = 0
    let presentMale = 0
    let presentFemale = 0
    let sickMale = 0
    let sickFemale = 0
    let leaveMale = 0
    let leaveFemale = 0
    let absentMale = 0
    let absentFemale = 0

    for (const r of records) {
      totalMale += r.totalMale
      totalFemale += r.totalFemale
      presentMale += r.presentMale
      presentFemale += r.presentFemale
      sickMale += r.sickMale
      sickFemale += r.sickFemale
      leaveMale += r.leaveMale
      leaveFemale += r.leaveFemale
      absentMale += r.absentMale
      absentFemale += r.absentFemale
    }

    const totalStudents = totalMale + totalFemale
    const present = presentMale + presentFemale
    const sick = sickMale + sickFemale
    const leave = leaveMale + leaveFemale
    const absent = absentMale + absentFemale
    const rate = totalStudents > 0 ? (present / totalStudents) * 100 : 0

    const summary = {
      totalSchoolDays: entries.length,
      recordedDays: records.length,
      unrecordedDays: unrecordedDates.length,
      totalMale,
      totalFemale,
      totalStudents,
      presentMale,
      presentFemale,
      present,
      sickMale,
      sickFemale,
      sick,
      leaveMale,
      leaveFemale,
      leave,
      absentMale,
      absentFemale,
      absent,
      rate,
    }

    return NextResponse.json({
      classroom,
      entries,
      records,
      unrecordedDates,
      summary,
    })
  } catch (error: any) {
    console.error('Classroom history error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
