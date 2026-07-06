import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'semester_settings' },
    })

    if (!setting) {
      return NextResponse.json({
        academicYear: new Date().getFullYear() + 543,
        term1: { start: '', end: '' },
        term2: { start: '', end: '' },
      })
    }

    const data = JSON.parse(setting.value)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching semester settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}
