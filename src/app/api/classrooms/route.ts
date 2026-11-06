import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enrollmentForDate } from '@/lib/enrollment-server'
import { validEnrollmentChange } from '@/lib/enrollment-counts'

// GET /api/classrooms - list all classrooms ordered by sortOrder
export async function GET(req: NextRequest) {
  try {
    const classrooms = await db.classroom.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    const date = req.nextUrl.searchParams.get('date') || today
    if (!validEnrollmentChange(date, 0, 0, date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    return NextResponse.json({ classrooms: await enrollmentForDate(classrooms, date) })
  } catch (error) {
    console.error('Failed to fetch classrooms:', error)
    return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 })
  }
}
