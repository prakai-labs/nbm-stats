import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/classrooms - list all classrooms ordered by sortOrder
export async function GET() {
  try {
    const classrooms = await db.classroom.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ classrooms })
  } catch (error) {
    console.error('Failed to fetch classrooms:', error)
    return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 })
  }
}
