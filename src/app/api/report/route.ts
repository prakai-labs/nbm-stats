import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/report?from=YYYY-MM-DD&to=YYYY-MM-DD
// ส่งข้อมูลรายงานแบบรวม สำหรับใช้ในการสร้าง PDF
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'ต้องระบุ from และ to' }, { status: 400 })
    }

    if (from > to) {
      return NextResponse.json({ error: 'from ต้องมาก่อน to' }, { status: 400 })
    }

    // ดึงข้อมูลทั้งหมดในช่วง
    const records = await db.attendanceRecord.findMany({
      where: { date: { gte: from, lte: to } },
      include: { classroom: true },
      orderBy: [{ date: 'asc' }, { classroom: { sortOrder: 'asc' } }],
    })

    const classrooms = await db.classroom.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    // กลุ่มข้อมูลตามวัน
    const byDate = new Map<string, typeof records>()
    for (const r of records) {
      if (!byDate.has(r.date)) byDate.set(r.date, [])
      byDate.get(r.date)!.push(r)
    }

    // สร้างรายการวันทั้งหมดในช่วง (รวมวันที่ไม่มีข้อมูล)
    const dates: string[] = []
    const start = new Date(from + 'T00:00:00Z')
    const end = new Date(to + 'T00:00:00Z')
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      dates.push(dateStr)
    }

    // สรุปรวมทั้งช่วง
    const summary = {
      from,
      to,
      totalDays: dates.length,
      recordedDays: byDate.size,
      totalMale: records.reduce((s, r) => s + r.totalMale, 0),
      totalFemale: records.reduce((s, r) => s + r.totalFemale, 0),
      totalStudents: records.reduce((s, r) => s + r.totalMale + r.totalFemale, 0),
      presentMale: records.reduce((s, r) => s + r.presentMale, 0),
      presentFemale: records.reduce((s, r) => s + r.presentFemale, 0),
      present: records.reduce((s, r) => s + r.presentMale + r.presentFemale, 0),
      sickMale: records.reduce((s, r) => s + r.sickMale, 0),
      sickFemale: records.reduce((s, r) => s + r.sickFemale, 0),
      sick: records.reduce((s, r) => s + r.sickMale + r.sickFemale, 0),
      leaveMale: records.reduce((s, r) => s + r.leaveMale, 0),
      leaveFemale: records.reduce((s, r) => s + r.leaveFemale, 0),
      leave: records.reduce((s, r) => s + r.leaveMale + r.leaveFemale, 0),
      absentMale: records.reduce((s, r) => s + r.absentMale, 0),
      absentFemale: records.reduce((s, r) => s + r.absentFemale, 0),
      absent: records.reduce((s, r) => s + r.absentMale + r.absentFemale, 0),
    }

    // สรุปรายวัน (สำหรับกราฟแนวโน้ม)
    const dailySummary = dates.map((date) => {
      const dayRecords = byDate.get(date) || []
      const totalMale = dayRecords.reduce((s, r) => s + r.totalMale, 0)
      const totalFemale = dayRecords.reduce((s, r) => s + r.totalFemale, 0)
      const total = totalMale + totalFemale
      const present = dayRecords.reduce((s, r) => s + r.presentMale + r.presentFemale, 0)
      const sick = dayRecords.reduce((s, r) => s + r.sickMale + r.sickFemale, 0)
      const leave = dayRecords.reduce((s, r) => s + r.leaveMale + r.leaveFemale, 0)
      const absent = dayRecords.reduce((s, r) => s + r.absentMale + r.absentFemale, 0)
      return {
        date,
        totalMale,
        totalFemale,
        total,
        present,
        sick,
        leave,
        absent,
        presentMale: dayRecords.reduce((s, r) => s + r.presentMale, 0),
        presentFemale: dayRecords.reduce((s, r) => s + r.presentFemale, 0),
        sickMale: dayRecords.reduce((s, r) => s + r.sickMale, 0),
        sickFemale: dayRecords.reduce((s, r) => s + r.sickFemale, 0),
        leaveMale: dayRecords.reduce((s, r) => s + r.leaveMale, 0),
        leaveFemale: dayRecords.reduce((s, r) => s + r.leaveFemale, 0),
        absentMale: dayRecords.reduce((s, r) => s + r.absentMale, 0),
        absentFemale: dayRecords.reduce((s, r) => s + r.absentFemale, 0),
        rate: total > 0 ? (present / total) * 100 : 0,
        hasData: dayRecords.length > 0,
        classroomCount: dayRecords.length,
      }
    })

    // สรุปรายห้อง (เฉพาะห้องที่มีข้อมูลในช่วง)
    const byClassroom = new Map<string, {
      classroomId: string
      code: string
      name: string
      level: string
      totalMale: number
      totalFemale: number
      total: number
      present: number
      sick: number
      leave: number
      absent: number
      recordedDays: number
    }>()

    for (const r of records) {
      const cur = byClassroom.get(r.classroomId) ?? {
        classroomId: r.classroomId,
        code: r.classroom.code,
        name: r.classroom.name,
        level: r.classroom.level,
        totalMale: 0,
        totalFemale: 0,
        total: 0,
        present: 0,
        sick: 0,
        leave: 0,
        absent: 0,
        recordedDays: 0,
      }
      cur.totalMale += r.totalMale
      cur.totalFemale += r.totalFemale
      cur.total += r.totalMale + r.totalFemale
      cur.present += r.presentMale + r.presentFemale
      cur.sick += r.sickMale + r.sickFemale
      cur.leave += r.leaveMale + r.leaveFemale
      cur.absent += r.absentMale + r.absentFemale
      cur.recordedDays += 1
      byClassroom.set(r.classroomId, cur)
    }

    const classroomSummary = Array.from(byClassroom.values()).sort(
      (a, b) => {
        const aSort = classrooms.find((c) => c.id === a.classroomId)?.sortOrder ?? 0
        const bSort = classrooms.find((c) => c.id === b.classroomId)?.sortOrder ?? 0
        return aSort - bSort
      }
    )

    return NextResponse.json({
      summary,
      dailySummary,
      classroomSummary,
      daysWithRecords: Array.from(byDate.entries()).map(([date, dayRecords]) => ({
        date,
        records: dayRecords.map((r) => ({
          id: r.id,
          date: r.date,
          classroomId: r.classroomId,
          classroom: {
            id: r.classroom.id,
            code: r.classroom.code,
            name: r.classroom.name,
            level: r.classroom.level,
            sortOrder: r.classroom.sortOrder,
          },
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
        })),
      })),
    })
  } catch (error) {
    console.error('Failed to fetch report:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
