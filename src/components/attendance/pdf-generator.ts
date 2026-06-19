// ฟังก์ชันสร้าง PDF รายงานสถิตินักเรียน
// 1 วัน = 1 หน้า A4 แนวนอน + หน้าสรุปหลายวัน + กราฟแนวโน้ม
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatThaiDate, formatThaiDateShort } from './utils'

// ===== Types =====
interface ClassroomInfo {
  id: string
  code: string
  name: string
  level: string
  sortOrder: number
}

interface DayRecord {
  id: string
  date: string
  classroomId: string
  classroom: ClassroomInfo
  totalMale: number
  totalFemale: number
  sickMale: number
  sickFemale: number
  leaveMale: number
  leaveFemale: number
  absentMale: number
  absentFemale: number
  presentMale: number
  presentFemale: number
  note: string | null
  recordedBy: string | null
}

interface ReportData {
  summary: {
    from: string
    to: string
    totalDays: number
    recordedDays: number
    totalMale: number
    totalFemale: number
    totalStudents: number
    presentMale: number
    presentFemale: number
    present: number
    sickMale: number
    sickFemale: number
    sick: number
    leaveMale: number
    leaveFemale: number
    leave: number
    absentMale: number
    absentFemale: number
    absent: number
  }
  dailySummary: Array<{
    date: string
    totalMale: number
    totalFemale: number
    total: number
    present: number
    sick: number
    leave: number
    absent: number
    presentMale: number
    presentFemale: number
    sickMale: number
    sickFemale: number
    leaveMale: number
    leaveFemale: number
    absentMale: number
    absentFemale: number
    rate: number
    hasData: boolean
    classroomCount: number
  }>
  classroomSummary: Array<{
    classroomId: string
    code: string
    name: string
    level: string
    totalMale: number
    totalFemale: number
    total: number
    present: number
    sick: number
    leave: number
    absent: number
    recordedDays: number
  }>
  daysWithRecords: Array<{
    date: string
    records: DayRecord[]
  }>
}

// ===== Constants =====
const PAGE_W = 297 // A4 landscape width in mm
const PAGE_H = 210
const MARGIN = 12
const CONTENT_W = PAGE_W - MARGIN * 2

const SCHOOL_NAME = 'โรงเรียนบ้านหนองบัวโนนเมือง'
const REPORT_TITLE = 'รายงานสถิตินักเรียนประจำวัน'

// รองรับฟอนต์ไทย
const FONT_REGULAR = 'SarabunRegular'
const FONT_BOLD = 'SarabunBold'

// Cache font blobs ที่ระดับ module — โหลดครั้งเดียวแล้วใช้ซ้ำ
let regularFontB64: string | null = null
let boldFontB64: string | null = null

async function loadFonts(): Promise<void> {
  if (regularFontB64 && boldFontB64) return
  try {
    const [regularRes, boldRes] = await Promise.all([
      fetch('/fonts/Sarabun-Regular.ttf'),
      fetch('/fonts/Sarabun-Bold.ttf'),
    ])
    if (!regularRes.ok || !boldRes.ok) throw new Error('font fetch failed')
    const regularBuf = await regularRes.arrayBuffer()
    const boldBuf = await boldRes.arrayBuffer()
    regularFontB64 = arrayBufferToBase64(regularBuf)
    boldFontB64 = arrayBufferToBase64(boldBuf)
  } catch (err) {
    console.error('Failed to load Thai font:', err)
  }
}

function registerFonts(doc: jsPDF): void {
  if (!regularFontB64 || !boldFontB64) return
  doc.addFileToVFS('Sarabun-Regular.ttf', regularFontB64)
  doc.addFileToVFS('Sarabun-Bold.ttf', boldFontB64)
  doc.addFont('Sarabun-Regular.ttf', FONT_REGULAR, 'normal')
  doc.addFont('Sarabun-Bold.ttf', FONT_BOLD, 'normal')
  doc.addFont('Sarabun-Bold.ttf', FONT_REGULAR, 'bold')
  doc.addFont('Sarabun-Bold.ttf', FONT_BOLD, 'bold')
}

async function loadThaiFont(doc: jsPDF): Promise<void> {
  await loadFonts()
  registerFonts(doc)
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[])
  }
  return btoa(binary)
}

function setFont(doc: jsPDF, bold = false, size = 10) {
  // ใช้ FONT_BOLD เป็นชื่อ font ต่างหาก (register เป็น normal style)
  doc.setFont(bold ? FONT_BOLD : FONT_REGULAR, 'normal')
  doc.setFontSize(size)
}

// ===== Header / Footer =====
function drawHeader(doc: jsPDF, subtitle: string) {
  // Banner
  doc.setFillColor(16, 185, 129) // emerald-500
  doc.rect(0, 0, PAGE_W, 28, 'F')

  // Logo circle
  doc.setFillColor(255, 255, 255)
  doc.circle(MARGIN + 8, 14, 7, 'F')
  doc.setTextColor(16, 185, 129)
  setFont(doc, true, 12)
  doc.text('บนม.', MARGIN + 8, 16, { align: 'center' })

  // Title
  doc.setTextColor(255, 255, 255)
  setFont(doc, true, 16)
  doc.text(SCHOOL_NAME, MARGIN + 22, 13)
  setFont(doc, false, 11)
  doc.text(subtitle, MARGIN + 22, 21)

  // Date on right
  setFont(doc, false, 10)
  doc.text(`พิมพ์เมื่อ ${new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}`, PAGE_W - MARGIN, 13, { align: 'right' })
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, PAGE_H - 8, PAGE_W - MARGIN, PAGE_H - 8)
  setFont(doc, false, 8)
  doc.setTextColor(100, 116, 139)
  doc.text(`${REPORT_TITLE} | ${SCHOOL_NAME}`, MARGIN, PAGE_H - 4)
  doc.text(`หน้า ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' })
}

// ===== Summary cards row =====
function drawSummaryRow(doc: jsPDF, y: number, items: Array<{ label: string; value: string; sub?: string; color: [number, number, number] }>): number {
  const cardW = (CONTENT_W - (items.length - 1) * 3) / items.length
  const cardH = 22
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const x = MARGIN + i * (cardW + 3)
    // Background
    doc.setFillColor(item.color[0], item.color[1], item.color[2])
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F')
    // Label
    doc.setTextColor(255, 255, 255)
    setFont(doc, false, 9)
    doc.text(item.label, x + 4, y + 7)
    // Value
    setFont(doc, true, 16)
    doc.text(item.value, x + 4, y + 16)
    // Sub
    if (item.sub) {
      setFont(doc, false, 8)
      doc.text(item.sub, x + 4, y + 20)
    }
  }
  return y + cardH + 4
}

// ===== Bar chart (แนวโน้ม) =====
function drawTrendChart(doc: jsPDF, x: number, y: number, w: number, h: number, daily: ReportData['dailySummary']) {
  const days = daily.filter((d) => d.hasData)
  if (days.length === 0) {
    setFont(doc, false, 10)
    doc.setTextColor(150, 150, 150)
    doc.text('ไม่มีข้อมูลในช่วงที่เลือก', x + w / 2, y + h / 2, { align: 'center' })
    return
  }

  // Chart background
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)

  // Title
  setFont(doc, true, 11)
  doc.setTextColor(30, 41, 59)
  doc.text('กราฟแนวโน้มอัตราการมาเรียนรายวัน', x + 4, y + 7)

  // Chart area
  const chartX = x + 12
  const chartY = y + 14
  const chartW = w - 16
  const chartH = h - 28

  // Y-axis grid (0, 25, 50, 75, 100)
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.2)
  for (let i = 0; i <= 4; i++) {
    const lineY = chartY + (chartH / 4) * i
    doc.line(chartX, lineY, chartX + chartW, lineY)
    setFont(doc, false, 7)
    doc.setTextColor(120, 120, 120)
    doc.text(`${100 - i * 25}`, chartX - 2, lineY + 1, { align: 'right' })
  }

  // Draw line
  if (days.length >= 2) {
    doc.setDrawColor(13, 148, 136)
    doc.setLineWidth(0.8)
    for (let i = 0; i < days.length - 1; i++) {
      const x1 = chartX + (chartW / (days.length - 1)) * i
      const y1 = chartY + chartH - (days[i].rate / 100) * chartH
      const x2 = chartX + (chartW / (days.length - 1)) * (i + 1)
      const y2 = chartY + chartH - (days[i + 1].rate / 100) * chartH
      doc.line(x1, y1, x2, y2)
    }
  }

  // Draw points + labels
  doc.setFillColor(13, 148, 136)
  setFont(doc, false, 6)
  doc.setTextColor(60, 60, 60)
  days.forEach((d, i) => {
    const px = chartX + (days.length >= 2 ? (chartW / (days.length - 1)) * i : chartW / 2)
    const py = chartY + chartH - (d.rate / 100) * chartH
    doc.circle(px, py, 1.2, 'F')
    // Date label (rotated)
    if (days.length <= 31) {
      const dateLabel = d.date.slice(8) + '/' + d.date.slice(5, 7)
      doc.text(dateLabel, px, chartY + chartH + 3, { align: 'center', angle: 45 })
    }
  })

  // X-axis label
  setFont(doc, false, 7)
  doc.setTextColor(100, 100, 100)
  doc.text('วันที่', chartX + chartW / 2, y + h - 4, { align: 'center' })
  doc.text('อัตราการมาเรียน (%)', x + 3, y + h / 2, { align: 'center', angle: 90 })
}

// ===== Bar chart stacked (ชาย/หญิง รายวัน) =====
function drawStackedBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, daily: ReportData['dailySummary']) {
  const days = daily.filter((d) => d.hasData)
  if (days.length === 0) return

  // Chart background
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')

  // Title
  setFont(doc, true, 11)
  doc.setTextColor(30, 41, 59)
  doc.text('กราฟจำนวนนักเรียน ชาย/หญิง รายวัน', x + 4, y + 7)

  const chartX = x + 12
  const chartY = y + 14
  const chartW = w - 16
  const chartH = h - 24

  const maxTotal = Math.max(...days.map((d) => d.total), 1)

  // Y-axis
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.2)
  for (let i = 0; i <= 4; i++) {
    const lineY = chartY + (chartH / 4) * i
    doc.line(chartX, lineY, chartX + chartW, lineY)
    setFont(doc, false, 7)
    doc.setTextColor(120, 120, 120)
    doc.text(`${Math.round(maxTotal - (maxTotal / 4) * i)}`, chartX - 2, lineY + 1, { align: 'right' })
  }

  // Bars
  const barW = Math.min(8, chartW / days.length - 1)
  const gap = (chartW - barW * days.length) / Math.max(1, days.length - 1)
  days.forEach((d, i) => {
    const barX = chartX + i * (barW + gap)
    const maleH = (d.totalMale / maxTotal) * chartH
    const femaleH = (d.totalFemale / maxTotal) * chartH
    // Male bar (sky)
    doc.setFillColor(14, 165, 233)
    doc.rect(barX, chartY + chartH - maleH, barW, maleH, 'F')
    // Female bar (pink) — stacked
    doc.setFillColor(236, 72, 153)
    doc.rect(barX, chartY + chartH - maleH - femaleH, barW, femaleH, 'F')
  })

  // Legend
  setFont(doc, false, 8)
  doc.setTextColor(60, 60, 60)
  doc.setFillColor(14, 165, 233)
  doc.rect(chartX + chartW - 60, y + 4, 4, 4, 'F')
  doc.text('ชาย', chartX + chartW - 54, y + 8)
  doc.setFillColor(236, 72, 153)
  doc.rect(chartX + chartW - 30, y + 4, 4, 4, 'F')
  doc.text('หญิง', chartX + chartW - 24, y + 8)
}

// ===== Generate daily page (1 วัน = 1 หน้า) =====
function drawDailyPage(doc: jsPDF, day: { date: string; records: DayRecord[] }) {
  // Header
  drawHeader(doc, `รายงานประจำวันที่ ${formatThaiDate(day.date)}`)

  let y = 36

  // Summary cards row
  const totals = day.records.reduce(
    (acc, r) => ({
      totalMale: acc.totalMale + r.totalMale,
      totalFemale: acc.totalFemale + r.totalFemale,
      present: acc.present + r.presentMale + r.presentFemale,
      sick: acc.sick + r.sickMale + r.sickFemale,
      leave: acc.leave + r.leaveMale + r.leaveFemale,
      absent: acc.absent + r.absentMale + r.absentFemale,
    }),
    { totalMale: 0, totalFemale: 0, present: 0, sick: 0, leave: 0, absent: 0 }
  )
  const totalStudents = totals.totalMale + totals.totalFemale
  const rate = totalStudents > 0 ? (totals.present / totalStudents) * 100 : 0

  y = drawSummaryRow(doc, y, [
    { label: 'จำนวนนักเรียนทั้งหมด', value: `${totalStudents}`, sub: `ชาย ${totals.totalMale} · หญิง ${totals.totalFemale}`, color: [51, 65, 85] },
    { label: 'นักเรียนมาเรียน', value: `${totals.present}`, sub: `${rate.toFixed(1)}% ของทั้งหมด`, color: [16, 185, 129] },
    { label: 'ป่วย / ลา / ขาด', value: `${totals.sick + totals.leave + totals.absent}`, sub: `ป่วย ${totals.sick} · ลา ${totals.leave} · ขาด ${totals.absent}`, color: [244, 63, 94] },
    { label: 'อัตราการมาเรียน', value: `${rate.toFixed(1)}%`, sub: rate >= 95 ? 'ดีมาก' : rate >= 90 ? 'ดี' : 'ควรปรับปรุง', color: [245, 158, 11] },
  ])

  y += 4

  // Table — group by level
  const groupedRecords = new Map<string, DayRecord[]>()
  for (const r of day.records) {
    if (!groupedRecords.has(r.classroom.level)) groupedRecords.set(r.classroom.level, [])
    groupedRecords.get(r.classroom.level)!.push(r)
  }
  const orderedLevels = ['อนุบาล', 'ประถม', 'มัธยมต้น'].filter((l) => groupedRecords.has(l))

  const tableRows: Array<Array<string | { content: string; colSpan?: number; styles?: any }>> = []

  for (const level of orderedLevels) {
    const levelRecords = groupedRecords.get(level)!.sort((a, b) => a.classroom.sortOrder - b.classroom.sortOrder)
    // Section header row
    tableRows.push([{ content: `ระดับ${level}`, colSpan: 17, styles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', halign: 'left' } }])
    // Data rows
    for (const r of levelRecords) {
      const total = r.totalMale + r.totalFemale
      const sick = r.sickMale + r.sickFemale
      const leave = r.leaveMale + r.leaveFemale
      const absent = r.absentMale + r.absentFemale
      const present = r.presentMale + r.presentFemale
      tableRows.push([
        `${r.classroom.code} ${r.classroom.name}`,
        `${r.totalMale}`, `${r.totalFemale}`, `${total}`,
        `${r.sickMale}`, `${r.sickFemale}`, `${sick}`,
        `${r.leaveMale}`, `${r.leaveFemale}`, `${leave}`,
        `${r.absentMale}`, `${r.absentFemale}`, `${absent}`,
        `${r.presentMale}`, `${r.presentFemale}`, `${present}`,
        r.recordedBy || '-',
      ])
    }
  }

  if (day.records.length === 0) {
    tableRows.push([{ content: 'ยังไม่มีข้อมูลสำหรับวันนี้', colSpan: 17, styles: { halign: 'center', textColor: [150, 150, 150] } }])
  }

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: 'ห้องเรียน', rowSpan: 2, styles: { fillColor: [30, 41, 59], halign: 'left' } },
        { content: 'จำนวนนักเรียน', colSpan: 3, styles: { fillColor: [30, 41, 59] } },
        { content: 'ป่วย', colSpan: 3, styles: { fillColor: [190, 18, 60] } },
        { content: 'ลา', colSpan: 3, styles: { fillColor: [180, 83, 9] } },
        { content: 'ขาด', colSpan: 3, styles: { fillColor: [153, 27, 27] } },
        { content: 'มาเรียน', colSpan: 3, styles: { fillColor: [4, 120, 87] } },
        { content: 'บันทึกโดย', rowSpan: 2, styles: { fillColor: [30, 41, 59] } },
      ],
      [
        'ชาย', 'หญิง', 'รวม',
        'ชาย', 'หญิง', 'รวม',
        'ชาย', 'หญิง', 'รวม',
        'ชาย', 'หญิง', 'รวม',
        'ชาย', 'หญิง', 'รวม',
      ].map((t) => ({ content: t, styles: { fillColor: [51, 65, 85], fontSize: 8 } })),
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 9,
      font: FONT_BOLD,
      halign: 'center',
      valign: 'middle',
      lineColor: [255, 255, 255],
      lineWidth: 0.3,
    },
    bodyStyles: {
      font: FONT_REGULAR,
      fontSize: 9,
      halign: 'center',
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 38, font: FONT_BOLD },
      // ชาย columns - sky color text
      1: { textColor: [3, 105, 161] },
      4: { textColor: [3, 105, 161] },
      7: { textColor: [3, 105, 161] },
      10: { textColor: [3, 105, 161] },
      13: { textColor: [3, 105, 161] },
      // หญิง columns - pink color text
      2: { textColor: [157, 23, 77] },
      5: { textColor: [157, 23, 77] },
      8: { textColor: [157, 23, 77] },
      11: { textColor: [157, 23, 77] },
      14: { textColor: [157, 23, 77] },
      // รวม columns - bold
      3: { font: FONT_BOLD },
      6: { font: FONT_BOLD, textColor: [190, 18, 60] },
      9: { font: FONT_BOLD, textColor: [180, 83, 9] },
      12: { font: FONT_BOLD, textColor: [153, 27, 27] },
      15: { font: FONT_BOLD, textColor: [4, 120, 87], fillColor: [236, 253, 245] },
      16: { halign: 'left', fontSize: 8, cellWidth: 25 },
    },
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage: () => {
      // Footer
      drawFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages())
    },
  })
}

// ===== Generate summary page (สำหรับรายงานหลายวัน) =====
function drawSummaryPage(doc: jsPDF, data: ReportData) {
  drawHeader(doc, `สรุปรายงานช่วง ${formatThaiDateShort(data.summary.from)} ถึง ${formatThaiDateShort(data.summary.to)}`)

  let y = 36
  const s = data.summary
  const totalStudents = s.totalStudents
  const rate = totalStudents > 0 ? (s.present / totalStudents) * 100 : 0

  // Summary cards
  y = drawSummaryRow(doc, y, [
    { label: 'จำนวนวันที่บันทึก', value: `${s.recordedDays}`, sub: `จาก ${s.totalDays} วันในช่วง`, color: [51, 65, 85] },
    { label: 'รวมนักเรียนทั้งหมด', value: `${totalStudents}`, sub: `ชาย ${s.totalMale} · หญิง ${s.totalFemale}`, color: [16, 185, 129] },
    { label: 'มาเรียนรวม', value: `${s.present}`, sub: `ชาย ${s.presentMale} · หญิง ${s.presentFemale}`, color: [4, 120, 87] },
    { label: 'อัตราการมาเรียนเฉลี่ย', value: `${rate.toFixed(1)}%`, sub: rate >= 95 ? 'ดีมาก' : rate >= 90 ? 'ดี' : 'ควรปรับปรุง', color: [245, 158, 11] },
  ])

  y += 4

  // การ์ดเล็ก: ป่วย/ลา/ขาด
  y = drawSummaryRow(doc, y, [
    { label: 'ป่วยรวม', value: `${s.sick}`, sub: `ชาย ${s.sickMale} · หญิง ${s.sickFemale}`, color: [244, 63, 94] },
    { label: 'ลารวม', value: `${s.leave}`, sub: `ชาย ${s.leaveMale} · หญิง ${s.leaveFemale}`, color: [245, 158, 11] },
    { label: 'ขาดรวม', value: `${s.absent}`, sub: `ชาย ${s.absentMale} · หญิง ${s.absentFemale}`, color: [220, 38, 38] },
    { label: 'ป่วย+ลา+ขาด รวม', value: `${s.sick + s.leave + s.absent}`, sub: `${(100 - rate).toFixed(1)}% ของทั้งหมด`, color: [153, 27, 27] },
  ])

  y += 6

  // กราฟแนวโน้ม
  drawTrendChart(doc, MARGIN, y, CONTENT_W / 2 - 2, 60, data.dailySummary)
  // กราฟ stacked bar
  drawStackedBarChart(doc, MARGIN + CONTENT_W / 2 + 2, y, CONTENT_W / 2 - 2, 60, data.dailySummary)

  y += 70

  // ตารางเปรียบเทียบรายห้อง
  const classroomRows = data.classroomSummary.map((c) => {
    const rate = c.total > 0 ? (c.present / c.total) * 100 : 0
    return [
      `${c.code}`,
      c.name,
      `${c.totalMale}`,
      `${c.totalFemale}`,
      `${c.total}`,
      `${c.present}`,
      `${c.sick}`,
      `${c.leave}`,
      `${c.absent}`,
      `${c.recordedDays}`,
      `${rate.toFixed(1)}%`,
    ]
  })

  if (classroomRows.length === 0) {
    classroomRows.push([{ content: 'ยังไม่มีข้อมูลในช่วงที่เลือก', colSpan: 11, styles: { halign: 'center', textColor: [150, 150, 150] } }])
  }

  autoTable(doc, {
    startY: y,
    head: [[
      'รหัส', 'ชื่อห้อง', 'ชาย', 'หญิง', 'รวม', 'มา', 'ป่วย', 'ลา', 'ขาด', 'วันที่บันทึก', 'อัตราการมา',
    ]],
    body: classroomRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 9,
      font: FONT_BOLD,
      halign: 'center',
    },
    bodyStyles: {
      font: FONT_REGULAR,
      fontSize: 9,
      halign: 'center',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: 'left', font: FONT_BOLD, cellWidth: 14 },
      1: { halign: 'left', cellWidth: 50 },
      10: { font: FONT_BOLD, textColor: [4, 120, 87] },
    },
    margin: { left: MARGIN, right: MARGIN },
  })
}

// ===== Main entry =====
export async function generateReportPDF(data: ReportData, options: { includeDaily?: boolean; includeSummary?: boolean } = {}): Promise<Blob> {
  const { includeDaily = true, includeSummary = true } = options

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  await loadThaiFont(doc)

  // Summary page (always first if includeSummary)
  if (includeSummary) {
    drawSummaryPage(doc, data)
  }

  // Daily pages (1 วัน = 1 หน้า)
  if (includeDaily) {
    for (const day of data.daysWithRecords) {
      doc.addPage('a4', 'landscape')
      drawDailyPage(doc, day)
    }
  }

  // Update page numbers (need to know total pages first)
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    // Re-draw footer with correct page numbers
    doc.setFillColor(255, 255, 255)
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F')
    drawFooter(doc, i, totalPages)
  }

  return doc.output('blob')
}
