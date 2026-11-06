import { describe, expect, test } from 'bun:test'
import { isHoliday } from './holidays'
import { eventsForDate, eventsForMonth } from './academic-calendar'

describe('วันหยุดภาคเรียนที่ 2/2569', () => {
  test('วันหยุดชดเชย 7 ธันวาคมตรงกับปฏิทินโรงเรียน', () => {
    expect(isHoliday('2026-12-07')).toBe(true)
  })
  test('วันเรียนรายเดือนตรงตามเอกสารและรวม 103 วัน', () => {
    const counts = [0, 0, 0, 0, 0]
    for (let t = Date.UTC(2026, 10, 2); t <= Date.UTC(2027, 2, 31); t += 86400000) {
      const d = new Date(t)
      const weekday = d.getUTCDay()
      if (weekday !== 0 && weekday !== 6 && !isHoliday(d.toISOString().slice(0, 10))) {
        counts[(d.getUTCFullYear() - 2026) * 12 + d.getUTCMonth() - 10]++
      }
    }
    expect(counts).toEqual([21, 20, 20, 19, 23])
    expect(counts.reduce((a, b) => a + b, 0)).toBe(103)
  })
  test('กิจกรรมซ้อนวันและช่วงหลายวันแสดงครบ', () => {
    expect(eventsForDate('2026-11-20').map(event => event.title)).toEqual([
      'งานศิลปหัตถกรรมระดับเขตพื้นที่', 'แข่งกีฬาภายใน',
    ])
    expect(eventsForDate('2026-12-15').length).toBe(2)
    expect(eventsForDate('2027-02-22')[0]?.kind).toBe('holiday')
    expect(eventsForMonth('2027-04').some(event => event.title.includes('NT ป.3'))).toBe(true)
  })
})
