import { describe, expect, mock, test } from 'bun:test'

let rows: Array<{ key: string; value: string }> = []
mock.module('@/lib/db', () => ({ db: { systemSetting: { findMany: async () => rows } } }))
const { enrollmentForDate } = await import('./enrollment-server')

describe('จำนวนรายชั้นจากประวัติวันที่มีผล', () => {
  test('ไม่ใช้จำนวนปัจจุบันกับวันที่ก่อนข้อมูลตั้งต้น', async () => {
    rows = [{ key: 'enrollment_count:room:2026-11-02', value: JSON.stringify({ male: 4, female: 2 }) }]
    const room = [{ id: 'room', defaultMale: 5, defaultFemale: 3 }]
    expect((await enrollmentForDate(room, '2026-11-01'))[0].countKnown).toBe(false)
    expect((await enrollmentForDate(room, '2026-11-02'))[0]).toMatchObject({ defaultMale: 4, defaultFemale: 2, countKnown: true })
  })
  test('ข้อมูลประวัติที่เสียหายไม่ถูกนำมาใช้เงียบ ๆ', async () => {
    rows = [{ key: 'enrollment_count:room:2026-11-02', value: '{invalid' }]
    await expect(enrollmentForDate([{ id: 'room', defaultMale: 1, defaultFemale: 1 }], '2026-11-02')).rejects.toThrow()
  })
})
