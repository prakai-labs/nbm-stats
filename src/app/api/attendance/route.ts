import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/attendance?date=YYYY-MM-DD
// GET /api/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (date) {
      const records = await db.attendanceRecord.findMany({
        where: { date },
        include: { classroom: true },
        orderBy: { classroom: { sortOrder: 'asc' } },
      })
      return NextResponse.json({ records })
    }

    if (from && to) {
      const records = await db.attendanceRecord.findMany({
        where: { date: { gte: from, lte: to } },
        include: { classroom: true },
        orderBy: [{ date: 'asc' }, { classroom: { sortOrder: 'asc' } }],
      })
      return NextResponse.json({ records })
    }

    const today = new Date()
    const ninetyDaysAgo = new Date(today)
    ninetyDaysAgo.setDate(today.getDate() - 90)
    const fromStr = ninetyDaysAgo.toISOString().slice(0, 10)
    const toStr = today.toISOString().slice(0, 10)

    const records = await db.attendanceRecord.findMany({
      where: { date: { gte: fromStr, lte: toStr } },
      include: { classroom: true },
      orderBy: [{ date: 'desc' }, { classroom: { sortOrder: 'asc' } }],
    })
    return NextResponse.json({ records })
  } catch (error) {
    console.error('Failed to fetch attendance:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
  }
}

// POST /api/attendance - upsert a record (auto-calc present)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      date, classroomId,
      totalMale, totalFemale,
      sickMale, sickFemale,
      leaveMale, leaveFemale,
      absentMale, absentFemale,
      note, recordedBy,
    } = body

    if (!date || !classroomId) {
      return NextResponse.json({ error: 'date และ classroomId เป็นข้อมูลจำเป็น' }, { status: 400 })
    }

    const male = Number(totalMale) || 0
    const female = Number(totalFemale) || 0
    const sM = Number(sickMale) || 0
    const sF = Number(sickFemale) || 0
    const lM = Number(leaveMale) || 0
    const lF = Number(leaveFemale) || 0
    const aM = Number(absentMale) || 0
    const aF = Number(absentFemale) || 0

    if (male < 0 || female < 0 || sM < 0 || sF < 0 || lM < 0 || lF < 0 || aM < 0 || aF < 0) {
      return NextResponse.json({ error: 'ค่าจำนวนต้องไม่ติดลบ' }, { status: 400 })
    }

    if (sM + lM + aM > male) {
      return NextResponse.json(
        { error: 'จำนวนป่วย+ลา+ขาด ของนักเรียนชาย ต้องไม่เกินจำนวนนักเรียนชายทั้งหมด' },
        { status: 400 }
      )
    }

    if (sF + lF + aF > female) {
      return NextResponse.json(
        { error: 'จำนวนป่วย+ลา+ขาด ของนักเรียนหญิง ต้องไม่เกินจำนวนนักเรียนหญิงทั้งหมด' },
        { status: 400 }
      )
    }

    const presentMale = Math.max(0, male - sM - lM - aM)
    const presentFemale = Math.max(0, female - sF - lF - aF)

    const currentUser = (await getServerSession(authOptions))?.user?.name || recordedBy || 'ไม่ระบุชื่อ'

    const record = await db.attendanceRecord.upsert({
      where: {
        date_classroomId: { date, classroomId },
      },
      update: {
        totalMale: male,
        totalFemale: female,
        sickMale: sM,
        sickFemale: sF,
        leaveMale: lM,
        leaveFemale: lF,
        absentMale: aM,
        absentFemale: aF,
        presentMale,
        presentFemale,
        note: note ?? null,
        recordedBy: currentUser,
      },
      create: {
        date,
        classroomId,
        totalMale: male,
        totalFemale: female,
        sickMale: sM,
        sickFemale: sF,
        leaveMale: lM,
        leaveFemale: lF,
        absentMale: aM,
        absentFemale: aF,
        presentMale,
        presentFemale,
        note: note ?? null,
        recordedBy: currentUser,
      },
      include: { classroom: true },
    })

    return NextResponse.json({ record })
  } catch (error) {
    console.error('Failed to save attendance:', error)
    return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 })
  }
}

// DELETE /api/attendance?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    await db.attendanceRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete attendance:', error)
    return NextResponse.json({ error: 'Failed to delete attendance' }, { status: 500 })
  }
}
