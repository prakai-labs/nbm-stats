import { describe, expect, test } from 'bun:test'
import { canCopyAttendance, previousCalendarDate } from './copy-attendance'

describe('คัดลอกสถิติเมื่อวาน', () => {
  test('ใช้วันก่อนหน้าจริงข้ามเดือนและปี', () => {
    expect(previousCalendarDate('2026-11-01')).toBe('2026-10-31')
    expect(previousCalendarDate('2027-01-01')).toBe('2026-12-31')
    expect(previousCalendarDate('2026-02-30')).toBe('')
  })
  test('ไม่คัดลอกถ้ายอดเปลี่ยน ไม่ทราบยอด หรือมีข้อมูลรอกรอก', () => {
    const row = { totalMale: '4', totalFemale: '2', sickMale: '', sickFemale: '', leaveMale: '', leaveFemale: '', absentMale: '', absentFemale: '' }
    expect(canCopyAttendance(row, { totalMale: 4, totalFemale: 2 })).toBe(true)
    expect(canCopyAttendance(row, { totalMale: 4, totalFemale: 1 })).toBe(false)
    expect(canCopyAttendance({ ...row, totalFemale: '' }, { totalMale: 4, totalFemale: 2 })).toBe(false)
    expect(canCopyAttendance({ ...row, sickMale: '0' }, { totalMale: 4, totalFemale: 2 })).toBe(false)
  })
})
