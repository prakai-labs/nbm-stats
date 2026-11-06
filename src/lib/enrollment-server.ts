import { db } from '@/lib/db'
import { countAtDate, type EnrollmentCount } from './enrollment-counts'

const PREFIX = 'enrollment_count:'
export const enrollmentKey = (classroomId: string, date: string) => `${PREFIX}${classroomId}:${date}`

type Classroom = { id: string; defaultMale: number; defaultFemale: number }
export async function enrollmentForDate<T extends Classroom>(classrooms: T[], date: string) {
  const settings = await db.systemSetting.findMany({ where: { key: { startsWith: PREFIX } } })
  const histories = new Map<string, EnrollmentCount[]>()
  for (const entry of settings) {
    const parts = entry.key.slice(PREFIX.length).split(':')
    if (parts.length !== 2) throw new Error('Invalid enrollment history key')
    const parsed = JSON.parse(entry.value) as { male: number; female: number }
    if (!Number.isSafeInteger(parsed.male) || parsed.male < 0 || !Number.isSafeInteger(parsed.female) || parsed.female < 0) throw new Error('Invalid enrollment history value')
    const history = histories.get(parts[0]) ?? []
    history.push({ date: parts[1], male: parsed.male, female: parsed.female })
    histories.set(parts[0], history)
  }
  return classrooms.map(c => {
    const history = histories.get(c.id) ?? []
    const applicable = countAtDate(history, date)
    return { ...c, defaultMale: applicable?.male ?? c.defaultMale, defaultFemale: applicable?.female ?? c.defaultFemale,
      countKnown: history.length === 0 || applicable !== null }
  })
}
