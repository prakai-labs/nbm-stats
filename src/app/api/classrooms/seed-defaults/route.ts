import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULTS: Record<string, { male: number; female: number }> = {
  'อ.1': { male: 1, female: 1 },
  'อ.2': { male: 1, female: 0 },
  'อ.3': { male: 3, female: 3 },
  'ป.1': { male: 5, female: 3 },
  'ป.2': { male: 4, female: 0 },
  'ป.3': { male: 4, female: 2 },
  'ป.4': { male: 7, female: 1 },
  'ป.5': { male: 3, female: 4 },
  'ป.6': { male: 3, female: 3 },
  'ม.1': { male: 4, female: 5 },
  'ม.2': { male: 7, female: 8 },
  'ม.3': { male: 2, female: 3 },
}

export async function POST() {
  try {
    const classrooms = await db.classroom.findMany()
    let updated = 0
    for (const c of classrooms) {
      const d = DEFAULTS[c.code]
      if (d && (c.defaultMale !== d.male || c.defaultFemale !== d.female)) {
        await db.classroom.update({
          where: { id: c.id },
          data: { defaultMale: d.male, defaultFemale: d.female },
        })
        updated++
      }
    }
    return NextResponse.json({ updated, total: classrooms.length })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to seed defaults' }, { status: 500 })
  }
}
