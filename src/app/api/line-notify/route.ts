import { NextRequest, NextResponse } from 'next/server'
import { pushMessage } from '@/lib/line-api'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, date } = body
    
    const groupId = process.env.LINE_GROUP_ID
    if (!groupId) {
      return NextResponse.json({ error: 'LINE_GROUP_ID is not configured' }, { status: 400 })
    }

    if (action === 'remind') {
      await pushMessage(groupId, [
        {
          type: 'text',
          text: 'ขอให้คุณครูประจำชั้นทุกท่าน บันทึกสถิติประจำวันด้วยนะคะ ขอบคุณค่ะ 🙏'
        }
      ])
      return NextResponse.json({ success: true })
    }

    if (action === 'report' && date) {
      const classrooms = await db.classroom.findMany({
        orderBy: [{ level: 'asc' }, { room: 'asc' }],
      })
      const records = await db.attendanceRecord.findMany({
        where: { date },
      })
      
      let total = 0, present = 0, sick = 0, leave = 0, absent = 0
      for (const r of records) {
        const t = r.totalMale + r.totalFemale
        total += t
        sick += r.sickMale + r.sickFemale
        leave += r.leaveMale + r.leaveFemale
        absent += r.absentMale + r.absentFemale
        present += r.presentMale + r.presentFemale
      }
      
      const percent = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0'
      
      const [year, month, day] = date.split('-')
      const formattedDate = `${parseInt(day)}/${parseInt(month)}/${year}`
      
      const recordedClassroomIds = new Set(records.map(r => r.classroomId))
      const unrecordedClassrooms = classrooms.filter(c => !recordedClassroomIds.has(c.id))
      
      let missingText = ''
      if (unrecordedClassrooms.length > 0) {
        const names = unrecordedClassrooms.map(c => c.name).join(', ')
        missingText = `\n\n⚠️ ชั้นที่ยังไม่ได้บันทึกสถิติ ได้แก่ ${names}`
      } else {
        missingText = `\n\n✨ ทุกชั้นรายงานเรียบร้อย ขอบคุณค่ะ`
      }
      
      const text = `📊 สรุปภาพรวมสถิติประจำวันที่ ${formattedDate}\n\nนักเรียนทั้งหมด: ${total} คน\n✅ มาเรียน: ${present} คน (${percent}%)\n😷 ป่วย: ${sick} คน\n📝 ลา: ${leave} คน\n❌ ขาด: ${absent} คน${missingText}`

      await pushMessage(groupId, [
        {
          type: 'text',
          text
        }
      ])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Line notify error:', error)
    return NextResponse.json({ error: 'Failed to send line notification' }, { status: 500 })
  }
}
