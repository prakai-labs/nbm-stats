import { NextRequest, NextResponse } from 'next/server'
import { pushMessage } from '@/lib/line-api'
import { isHoliday } from '@/lib/holidays'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  // 1. Verify CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check holidays
  // Get today's date in Asia/Bangkok
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) // YYYY-MM-DD
  if (isHoliday(today)) {
    return NextResponse.json({ message: 'Skipped (Holiday)' }, { status: 200 })
  }

  // 2.5 Check if it's school holiday (outside term 1 and term 2)
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'semester_settings' },
    })
    if (setting) {
      const data = JSON.parse(setting.value)
      const current = new Date(today)
      current.setHours(0,0,0,0)
      
      let isSchoolHoliday = true
      
      if (data.term1?.start && data.term1?.end) {
        const start = new Date(data.term1.start)
        const end = new Date(data.term1.end)
        start.setHours(0,0,0,0)
        end.setHours(23,59,59,999)
        if (current >= start && current <= end) isSchoolHoliday = false
      }
      
      if (data.term2?.start && data.term2?.end) {
        const start = new Date(data.term2.start)
        const end = new Date(data.term2.end)
        start.setHours(0,0,0,0)
        end.setHours(23,59,59,999)
        if (current >= start && current <= end) isSchoolHoliday = false
      }
      
      if (isSchoolHoliday) {
        return NextResponse.json({ message: 'Skipped (School Holiday)' }, { status: 200 })
      }
    }
  } catch (err) {
    console.error('Error checking semester settings in cron:', err)
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
  } catch (error) {
    console.error('Cron remind error:', error)
    return NextResponse.json({ error: 'Failed to send line notification' }, { status: 500 })
  }
}
