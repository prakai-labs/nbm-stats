import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/export-excel?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    const records = await db.attendanceRecord.findMany({
      where: { date: { gte: from, lte: to } },
      include: { classroom: true },
      orderBy: [{ date: 'asc' }, { classroom: { sortOrder: 'asc' } }],
    })

    // Group by date
    const byDate = new Map<string, typeof records>()
    for (const r of records) {
      if (!byDate.has(r.date)) byDate.set(r.date, [])
      byDate.get(r.date)!.push(r)
    }

    // Build HTML table
    const dates = Array.from(byDate.keys()).sort()
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>td{border:1px solid #ccc;padding:4px 8px;text-align:center}th{background:#059669;color:white;padding:6px 8px;text-align:center;font-weight:bold}.date{background:#ecfdf5}.label{text-align:left;font-weight:bold;background:#f0fdf4}</style></head><body><table>'

    // Header
    html += '<tr><th>วันที่</th><th>ห้อง</th><th>นร.ชาย</th><th>นร.หญิง</th><th>นร.รวม</th><th>ป่วยชาย</th><th>ป่วยหญิง</th><th>ป่วยรวม</th><th>ลาชาย</th><th>ลาหญิง</th><th>ลารวม</th><th>ขาดชาย</th><th>ขาดหญิง</th><th>ขาดรวม</th><th>มาชาย</th><th>มาหญิง</th><th>มารวม</th><th>หมายเหตุ</th><th>ผู้บันทึก</th></tr>'

    for (const date of dates) {
      const dayRecords = byDate.get(date)!
      let firstRow = true
      for (const r of dayRecords) {
        html += '<tr>'
        if (firstRow) {
          html += `<td class="date" rowspan="${dayRecords.length}">${date}</td>`
          firstRow = false
        }
        html += `<td class="label">${r.classroom.code}</td>`
        html += `<td>${r.totalMale}</td><td>${r.totalFemale}</td><td>${r.totalMale + r.totalFemale}</td>`
        html += `<td>${r.sickMale}</td><td>${r.sickFemale}</td><td>${r.sickMale + r.sickFemale}</td>`
        html += `<td>${r.leaveMale}</td><td>${r.leaveFemale}</td><td>${r.leaveMale + r.leaveFemale}</td>`
        html += `<td>${r.absentMale}</td><td>${r.absentFemale}</td><td>${r.absentMale + r.absentFemale}</td>`
        html += `<td>${r.presentMale}</td><td>${r.presentFemale}</td><td>${r.presentMale + r.presentFemale}</td>`
        html += `<td>${r.note || ''}</td><td>${r.recordedBy || ''}</td>`
        html += '</tr>'
      }
      // Daily summary row
      const totals = dayRecords.reduce((s, r) => ({
        male: s.male + r.totalMale, female: s.female + r.totalFemale,
        sM: s.sM + r.sickMale, sF: s.sF + r.sickFemale,
        lM: s.lM + r.leaveMale, lF: s.lF + r.leaveFemale,
        aM: s.aM + r.absentMale, aF: s.aF + r.absentFemale,
        pM: s.pM + r.presentMale, pF: s.pF + r.presentFemale,
      }), { male: 0, female: 0, sM: 0, sF: 0, lM: 0, lF: 0, aM: 0, aF: 0, pM: 0, pF: 0 })
      const rate = (totals.male + totals.female) > 0 ? ((totals.pM + totals.pF) / (totals.male + totals.female) * 100).toFixed(1) : '0'
      html += '<tr style="background:#f0fdf4;font-weight:bold">'
      html += `<td class="label">รวมวัน</td><td></td>`
      html += `<td>${totals.male}</td><td>${totals.female}</td><td>${totals.male + totals.female}</td>`
      html += `<td>${totals.sM}</td><td>${totals.sF}</td><td>${totals.sM + totals.sF}</td>`
      html += `<td>${totals.lM}</td><td>${totals.lF}</td><td>${totals.lM + totals.lF}</td>`
      html += `<td>${totals.aM}</td><td>${totals.aF}</td><td>${totals.aM + totals.aF}</td>`
      html += `<td>${totals.pM}</td><td>${totals.pF}</td><td>${totals.pM + totals.pF}</td>`
      html += `<td>${rate}%</td><td></td>`
      html += '</tr>'
    }

    html += '</table></body></html>'

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="attendance-${from}-to-${to}.xls"`,
      },
    })
  } catch (error) {
    console.error('Export Excel failed:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}