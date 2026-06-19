// ฟังก์ชันช่วยเหลือด้านวันที่และการจัดรูปแบบภาษาไทย

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export function todayBangkok(): string {
  const now = new Date()
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return bangkok.toISOString().slice(0, 10)
}

export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const date = new Date(Date.UTC(y, m - 1, d))
  const dayName = THAI_DAYS[date.getUTCDay()]
  const monthName = THAI_MONTHS[m - 1]
  const thaiYear = y + 543
  return `${dayName} ${d} ${monthName} ${thaiYear}`
}

export function formatThaiDateShort(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const monthName = THAI_MONTHS_SHORT[m - 1]
  const yy = (y + 543) % 100
  return `${d} ${monthName} ${yy.toString().padStart(2, '0')}`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('th-TH')
}

export function attendanceRate(present: number, total: number): number {
  if (total <= 0) return 0
  return (present / total) * 100
}
