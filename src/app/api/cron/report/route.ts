import { NextRequest, NextResponse } from 'next/server'
import { pushMessage } from '@/lib/line-api'
import { db } from '@/lib/db'
import { isHoliday } from '@/lib/holidays'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) // YYYY-MM-DD
  if (isHoliday(date)) {
    return NextResponse.json({ message: 'Skipped (Holiday)' }, { status: 200 })
  }

  // Check if it's school holiday (outside term 1 and term 2)
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'semester_settings' },
    })
    if (setting) {
      const data = JSON.parse(setting.value)
      const current = new Date(date)
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

  const groupId = process.env.LINE_GROUP_ID
  if (!groupId) {
    return NextResponse.json({ error: 'LINE_GROUP_ID not configured' }, { status: 500 })
  }

  try {
    const classrooms = await db.classroom.findMany({
      orderBy: { sortOrder: 'asc' },
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

    let grandTotal = 0
    for (const c of classrooms) {
      grandTotal += c.defaultMale + c.defaultFemale
    }

    const recordedClassroomIds = new Set(records.map(r => r.classroomId))
    const unrecordedClassrooms = classrooms.filter(c => !recordedClassroomIds.has(c.id))
    
    let unreportedCount = 0
    for (const c of unrecordedClassrooms) {
      unreportedCount += c.defaultMale + c.defaultFemale
    }

    let missingText = ''
    let reportStatusText = ''
    let percentText = percent + '%'
    
    if (unrecordedClassrooms.length > 0) {
      const codes = unrecordedClassrooms.map(c => c.code).join(', ')
      missingText = `\n\n⚠️ ชั้นที่ยังไม่ได้บันทึกสถิติ ได้แก่ ${codes}`
      reportStatusText = `\n📝 รายงานแล้ว: ${total} คน (ยังไม่รายงาน ${unreportedCount} คน)\n`
      percentText = percent + '% จากที่รายงาน'
    } else {
      missingText = `\n\n✨ ทุกชั้นรายงานเรียบร้อย ขอบคุณค่ะ`
      reportStatusText = `\n📝 รายงานครบถ้วนแล้ว\n`
    }

    const text = `📊 สรุปภาพรวมสถิติประจำวันที่ ${formattedDate}\n\nนักเรียนทั้งหมด: ${grandTotal} คน${reportStatusText}\n✅ มาเรียน: ${present} คน (${percentText})\n😷 ป่วย: ${sick} คน\n📝 ลา: ${leave} คน\n❌ ขาด: ${absent} คน${missingText}`

    await pushMessage(groupId, [
      {
        type: 'text',
        text
      }
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cron report error:', error)
    return NextResponse.json({ error: 'Failed to send line notification' }, { status: 500 })
  }
}
