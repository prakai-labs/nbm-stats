import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    // Compute summary metrics
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
      recordedDays: records.length,
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
      records,
      summary,
    })
  } catch (error: any) {
    console.error('Classroom history error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
