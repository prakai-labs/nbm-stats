import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pushMessage } from '@/lib/line-api'
import { isHoliday } from '@/lib/holidays'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  // 1. Verify CRON_SECRET or Admin Session
  const authHeader = req.headers.get('authorization')
  let isAuthorized = false

  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    isAuthorized = true
  }

  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    const session = await getServerSession(authOptions)
    if (session?.user?.isAdmin) {
      isAuthorized = true
    }
  } else if (process.env.NODE_ENV !== 'production') {
    isAuthorized = true
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check holidays
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) // YYYY-MM-DD
  
  // Allow admin to bypass holiday check if they add ?force=true
  const force = req.nextUrl.searchParams.get('force') === 'true'
  
  if (!force && isHoliday(today)) {
    return NextResponse.json({ message: 'Skipped (Holiday)' }, { status: 200 })
  }

  // 2.5 Check if it's school holiday (outside term 1 and term 2)
  // Only skip if settings exist AND have at least one term configured
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'semester_settings' },
    })
    if (setting) {
      const data = JSON.parse(setting.value)
      const hasTerm1 = data.term1?.start && data.term1?.end
      const hasTerm2 = data.term2?.start && data.term2?.end

      // Only check school holiday if at least one term is configured
      if (hasTerm1 || hasTerm2) {
        const current = new Date(today)
        current.setHours(0,0,0,0)
        let inTerm = false

        if (hasTerm1) {
          const start = new Date(data.term1.start)
          const end = new Date(data.term1.end)
          start.setHours(0,0,0,0)
          end.setHours(23,59,59,999)
          if (current >= start && current <= end) inTerm = true
        }

        if (!inTerm && hasTerm2) {
          const start = new Date(data.term2.start)
          const end = new Date(data.term2.end)
          start.setHours(0,0,0,0)
          end.setHours(23,59,59,999)
          if (current >= start && current <= end) inTerm = true
        }

        if (!inTerm) {
          return NextResponse.json({ message: 'Skipped (School Holiday)' }, { status: 200 })
        }
      }
    }
  } catch (err) {
    console.error('Error checking semester settings in cron:', err)
    // Don't block notification if settings check fails
  }

  // 3. Send message
  const groupId = process.env.LINE_GROUP_ID
  if (!groupId) {
    return NextResponse.json({ error: 'LINE_GROUP_ID not configured' }, { status: 500 })
  }

  try {
    await pushMessage(groupId, [
      {
        type: 'text',
        text: 'ขอให้คุณครูประจำชั้นทุกท่าน บันทึกสถิติประจำวันด้วยนะคะ ขอบคุณค่ะ 🙏'
      }
    ])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Cron remind error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send line notification' }, { status: 500 })
  }
}
