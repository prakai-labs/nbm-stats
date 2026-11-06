import { describe, expect, test } from 'bun:test'
import { countAtDate, validEnrollmentChange, dailyEnrollmentSummary } from './enrollment-counts'

describe('จำนวนนักเรียนตามวันที่มีผล', () => {
  test('เลือกยอดล่าสุดในวันที่ที่ต้องการและไม่ใช้ข้อมูลจากอนาคต', () => {
    const history = [{ date: '2026-11-02', male: 4, female: 2 }, { date: '2026-12-01', male: 3, female: 3 }]
    expect(countAtDate(history, '2026-11-01')).toBeNull()
    expect(countAtDate(history, '2026-11-30')).toEqual({ date: '2026-11-02', male: 4, female: 2 })
    expect(countAtDate(history, '2026-12-01')).toEqual({ date: '2026-12-01', male: 3, female: 3 })
  })
  test('รับเฉพาะวันที่จริง ไม่ใช่อนาคต และจำนวนเต็มไม่ติดลบ', () => {
    expect(validEnrollmentChange('2026-11-02', 4, 2, '2026-11-06')).toBe(true)
    expect(validEnrollmentChange('2026-11-07', 4, 2, '2026-11-06')).toBe(false)
    expect(validEnrollmentChange('2026-02-30', 4, 2, '2026-11-06')).toBe(false)
    expect(validEnrollmentChange('2026-11-02', -1, 2, '2026-11-06')).toBe(false)
    expect(validEnrollmentChange('2026-11-02', 1.5, 2, '2026-11-06')).toBe(false)
    expect(validEnrollmentChange('2026-11-02', 2147483648, 2, '2026-11-06')).toBe(false)
  })
  test('สรุปย้อนหลังใช้ยอดที่บันทึกไว้ และไม่เดายอดชั้นที่ไม่ทราบ', () => {
    const classes = [{ id: 'a', defaultMale: 8, defaultFemale: 8, countKnown: true }, { id: 'b', defaultMale: 2, defaultFemale: 1, countKnown: true }]
    expect(dailyEnrollmentSummary(classes, [{ classroomId: 'a', totalMale: 3, totalFemale: 4 }])).toEqual({ grandTotal: 10, unreportedCount: 3 })
    expect(dailyEnrollmentSummary([{ ...classes[0] }, { ...classes[1], countKnown: false }], [{ classroomId: 'a', totalMale: 3, totalFemale: 4 }])).toEqual({ grandTotal: null, unreportedCount: null })
  })
})
