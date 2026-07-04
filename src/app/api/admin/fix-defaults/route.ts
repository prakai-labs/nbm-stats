import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const classrooms = await db.classroom.findMany()
    const classroomMap = new Map(classrooms.map(c => [c.id, c]))

    const records = await db.attendanceRecord.findMany()

    let updatedCount = 0

    for (const record of records) {
      const classroom = classroomMap.get(record.classroomId)
      if (!classroom) continue

      if (record.totalMale !== classroom.defaultMale || record.totalFemale !== classroom.defaultFemale) {
        await db.attendanceRecord.update({
          where: { id: record.id },
          data: {
            totalMale: classroom.defaultMale,
            totalFemale: classroom.defaultFemale
          }
        })
        updatedCount++
      }
    }

    return NextResponse.json({ success: true, updatedCount })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
