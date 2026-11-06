export type EnrollmentCount = { date: string; male: number; female: number }
export function dailyEnrollmentSummary(rooms: Array<{id:string;defaultMale:number;defaultFemale:number;countKnown:boolean}>, records: Array<{classroomId:string;totalMale:number;totalFemale:number}>): {grandTotal: number | null; unreportedCount: number | null} {
  const byClass = new Map(records.map(record => [record.classroomId, record]))
  let grandTotal = 0, unreportedCount = 0
  for (const room of rooms) {
    const record = byClass.get(room.id)
    if (record) { grandTotal += record.totalMale + record.totalFemale; continue }
    if (!room.countKnown) return { grandTotal: null, unreportedCount: null }
    const expected = room.defaultMale + room.defaultFemale
    grandTotal += expected
    unreportedCount += expected
  }
  return { grandTotal, unreportedCount }
}
export function countAtDate(history: EnrollmentCount[], date: string): EnrollmentCount | null {
  return history.reduce<EnrollmentCount | null>((best, item) =>
    item.date <= date && (!best || item.date > best.date) ? item : best, null)
}
export function validEnrollmentChange(date: string, male: number, female: number, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date &&
    Number.isInteger(male) && male >= 0 && male <= 2147483647 && Number.isInteger(female) && female >= 0 && female <= 2147483647
}
