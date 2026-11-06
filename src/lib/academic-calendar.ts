// ปฏิทินโรงเรียนบ้านหนองบัวโนนเมือง ภาคเรียนที่ 2/2569 ตามเอกสารโรงเรียน
export type AcademicEvent = { start: string; end: string; title: string; kind: 'holiday' | 'event' }

export const academicEvents: AcademicEvent[] = [
  { start: '2026-11-02', end: '2026-11-02', title: 'เปิดภาคเรียนที่ 2 ปีการศึกษา 2569', kind: 'event' },
  { start: '2026-11-06', end: '2026-11-06', title: 'ประชุมผู้ปกครอง', kind: 'event' },
  { start: '2026-11-16', end: '2026-11-20', title: 'งานศิลปหัตถกรรมระดับเขตพื้นที่', kind: 'event' },
  { start: '2026-11-20', end: '2026-11-20', title: 'แข่งกีฬาภายใน', kind: 'event' },
  { start: '2026-12-01', end: '2026-12-04', title: 'แข่งกีฬาศูนย์เครือข่ายโรงเรียนชุมแพ', kind: 'event' },
  { start: '2026-12-07', end: '2026-12-07', title: 'หยุดชดเชยวันคล้ายวันพระราชสมภพพระบาทสมเด็จพระชนกาธิเบศรฯ', kind: 'holiday' },
  { start: '2026-12-09', end: '2026-12-09', title: 'อบรมคุณธรรมจริยธรรมนักเรียน', kind: 'event' },
  { start: '2026-12-10', end: '2026-12-10', title: 'วันรัฐธรรมนูญ', kind: 'holiday' },
  { start: '2026-12-14', end: '2026-12-18', title: 'เข้าค่ายพักแรมลูกเสือ', kind: 'event' },
  { start: '2026-12-15', end: '2026-12-15', title: 'ถวายพระเพลิงพระบรมศพสมเด็จพระบรมราชินีนาถพระพันปีหลวงฯ', kind: 'event' },
  { start: '2026-12-31', end: '2026-12-31', title: 'วันสิ้นปี (ระบุเป็นวันหยุดในปฏิทิน)', kind: 'holiday' },
  { start: '2027-01-01', end: '2027-01-01', title: 'วันขึ้นปีใหม่', kind: 'holiday' },
  { start: '2027-01-04', end: '2027-01-29', title: 'เตรียมความพร้อมการทดสอบระดับชาติ RT, NT และ O-NET', kind: 'event' },
  { start: '2027-01-16', end: '2027-01-16', title: 'วันครู', kind: 'event' },
  { start: '2027-01-30', end: '2027-01-30', title: 'ทดสอบระดับชาติ O-NET ป.6', kind: 'event' },
  { start: '2027-02-01', end: '2027-02-08', title: 'ทดสอบระดับชาติ O-NET ม.3', kind: 'event' },
  { start: '2027-02-17', end: '2027-02-17', title: 'ทดสอบระดับชาติ RT ป.1', kind: 'event' },
  { start: '2027-02-19', end: '2027-02-19', title: 'ทัศนศึกษา', kind: 'event' },
  { start: '2027-02-22', end: '2027-02-22', title: 'หยุดชดเชยวันมาฆบูชา', kind: 'holiday' },
  { start: '2027-02-24', end: '2027-02-24', title: 'ทดสอบระดับชาติ NT ป.3', kind: 'event' },
  { start: '2027-03-01', end: '2027-03-05', title: 'นิเทศภายใน', kind: 'event' },
  { start: '2027-03-11', end: '2027-03-11', title: 'ประกาศผลสอบ O-NET ป.6', kind: 'event' },
  { start: '2027-03-15', end: '2027-03-17', title: 'สอบปลายภาคเรียนที่ 2', kind: 'event' },
  { start: '2027-03-19', end: '2027-03-19', title: 'ประกาศผลสอบ O-NET ม.3', kind: 'event' },
  { start: '2027-03-22', end: '2027-03-22', title: 'ส่งผลการเรียนชั้น ป.6 และ ม.3', kind: 'event' },
  { start: '2027-03-22', end: '2027-03-25', title: 'ประเมินความสามารถนักเรียนปฐมวัย', kind: 'event' },
  { start: '2027-03-25', end: '2027-03-25', title: 'ประกาศผลสอบ RT ป.1', kind: 'event' },
  { start: '2027-03-26', end: '2027-03-26', title: 'ปัจฉิมนิเทศ และส่งผลการเรียนชั้น ป.1–5 และ ม.1–2', kind: 'event' },
  { start: '2027-03-31', end: '2027-03-31', title: 'ปิดภาคเรียนที่ 2 ปีการศึกษา 2569', kind: 'event' },
  { start: '2027-04-08', end: '2027-04-08', title: 'ประกาศผลสอบ NT ป.3', kind: 'event' },
]

export function eventsForDate(date: string): AcademicEvent[] {
  return academicEvents.filter(event => event.start <= date && event.end >= date)
}

export function eventsForMonth(month: string): AcademicEvent[] {
  return academicEvents.filter(event => event.start.slice(0, 7) <= month && event.end.slice(0, 7) >= month)
}
