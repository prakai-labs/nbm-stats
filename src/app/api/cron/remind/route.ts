import { NextRequest, NextResponse } from 'next/server'
import { pushMessage } from '@/lib/line-api'
import { isHoliday } from '@/lib/holidays'

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
