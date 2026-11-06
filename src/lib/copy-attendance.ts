export function previousCalendarDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''
  const day = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) return ''
  day.setUTCDate(day.getUTCDate() - 1)
  return day.toISOString().slice(0, 10)
}

type Row = { totalMale: string; totalFemale: string; sickMale: string; sickFemale: string; leaveMale: string; leaveFemale: string; absentMale: string; absentFemale: string }
type Previous = { totalMale: number; totalFemale: number }
export function canCopyAttendance(row: Row, previous: Previous): boolean {
  return row.totalMale !== '' && row.totalFemale !== '' &&
    Number(row.totalMale) === previous.totalMale && Number(row.totalFemale) === previous.totalFemale &&
    [row.sickMale, row.sickFemale, row.leaveMale, row.leaveFemale, row.absentMale, row.absentFemale].every(value => value === '')
}
