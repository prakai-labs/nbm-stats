import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/daily-log?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const log = await db.dailyLog.findUnique({ where: { date } })
    return NextResponse.json({ log })
  } catch (error) {
    console.error('Failed to fetch daily log:', error)
    return NextResponse.json({ error: 'Failed to fetch daily log' }, { status: 500 })
  }
}

// POST /api/daily-log
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, content, recordedBy, action } = body

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    // Director approval action
    if (action === 'approve') {
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'กรุณาล็อกอินก่อน' }, { status: 401 })
      }
      const approvedBy = session.user.email
      const approvedName = session.user.name || approvedBy
      const DIRECTOR_EMAILS = (process.env.DIRECTOR_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
      if (DIRECTOR_EMAILS.length > 0) {
        const email = (approvedBy || '').toLowerCase()
        if (!DIRECTOR_EMAILS.includes(email)) {
          return NextResponse.json({ error: 'ไม่ได้รับอนุญาต: เฉพาะผู้อำนวยการเท่านั้น' }, { status: 403 })
        }
      }
      const log = await db.dailyLog.upsert({
        where: { date },
        update: { directorApprovedBy: approvedBy, directorApprovedName: approvedName, directorApprovedAt: new Date() },
        create: { date, content: '', directorApprovedBy: approvedBy, directorApprovedName: approvedName, directorApprovedAt: new Date() },
      })
      return NextResponse.json({ log })
    }

    // Normal save
    const session = await getServerSession(authOptions)
    const actualRecordedBy = session?.user?.name || session?.user?.email || recordedBy || 'ไม่ระบุชื่อ'
    const log = await db.dailyLog.upsert({
      where: { date },
      update: { content, recordedBy },
      create: { date, content, recordedBy },
    })

    return NextResponse.json({ log })
  } catch (error) {
    console.error('Failed to save daily log:', error)
    return NextResponse.json({ error: 'Failed to save daily log' }, { status: 500 })
  }
}