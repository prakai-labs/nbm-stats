import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { academicYear, term1, term2 } = body

    if (!academicYear) {
      return NextResponse.json({ error: 'Academic year is required' }, { status: 400 })
    }

    // Read existing data to merge with
    let existingData: any = {}
    try {
      const existingSetting = await db.systemSetting.findUnique({ where: { key: 'semester_settings' } })
      if (existingSetting) {
        existingData = JSON.parse(existingSetting.value)
      }
    } catch (e) {
      console.error('Error reading existing semester settings:', e)
    }

    // Merge: only override the field that was explicitly sent
    const mergedData = {
      academicYear,
      term1: term1 !== undefined ? term1 : (existingData.term1 || null),
      term2: term2 !== undefined ? term2 : (existingData.term2 || null),
    }

    const valueStr = JSON.stringify(mergedData)

    const setting = await db.systemSetting.upsert({
      where: { key: 'semester_settings' },
      update: { value: valueStr },
      create: {
        key: 'semester_settings',
        value: valueStr,
      },
    })

    return NextResponse.json({ success: true, setting })
  } catch (error) {
    console.error('Error saving semester settings:', error)
    return NextResponse.json({ error: 'Failed to save settings: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
}
