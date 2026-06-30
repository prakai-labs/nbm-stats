'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Download, Loader2, CalendarDays, AlertCircle,
  TrendingUp, Users, CheckCircle2, Stethoscope, Calendar, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatThaiDate, formatThaiDateShort, todayBangkok, formatNumber } from './utils'
import { generateReportPDF } from './pdf-generator'

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
    presentMale: number
    presentFemale: number
    sick: number
    sickMale: number
    sickFemale: number
    leave: number
    leaveMale: number
    leaveFemale: number
    absent: number
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
  daysWithRecords: Array<{ date: string; records: any[] }>
}

// Preset ranges
const PRESETS = [
  { label: 'วันนี้', getRange: () => { const t = todayBangkok(); return { from: t, to: t } } },
  { label: 'สัปดาห์นี้', getRange: () => {
    const now = new Date()
    const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    const day = bangkok.getUTCDay()
    const monday = new Date(bangkok)
    monday.setUTCDate(bangkok.getUTCDate() - ((day + 6) % 7))
    const sunday = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)
    return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) }
  }},
  { label: 'เดือนนี้', getRange: () => {
    const now = new Date()
    const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    const y = bangkok.getUTCFullYear()
    const m = bangkok.getUTCMonth()
    const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const lastDayDate = new Date(Date.UTC(y, m + 1, 0))
    const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayDate.getUTCDate()).padStart(2, '0')}`
    return { from: firstDay, to: lastDay }
  }},
  { label: 'เดือนที่แล้ว', getRange: () => {
    const now = new Date()
    const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    const y = bangkok.getUTCFullYear()
    const m = bangkok.getUTCMonth() - 1
    const realDate = new Date(Date.UTC(y, m, 1))
    const ny = realDate.getUTCFullYear()
    const nm = realDate.getUTCMonth()
    const firstDay = `${ny}-${String(nm + 1).padStart(2, '0')}-01`
    const lastDayDate = new Date(Date.UTC(ny, nm + 1, 0))
    const lastDay = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(lastDayDate.getUTCDate()).padStart(2, '0')}`
    return { from: firstDay, to: lastDay }
  }},
  { label: 'ภาคเรียนที่ 1', getRange: () => ({ from: `${new Date().getFullYear()}-05-01`, to: `${new Date().getFullYear()}-09-30` }) },
  { label: 'ภาคเรียนที่ 2', getRange: () => ({ from: `${new Date().getFullYear()}-11-01`, to: `${new Date().getFullYear() + 1}-03-31` }) },
]

export function ReportView() {
  const today = todayBangkok()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [includeDaily, setIncludeDaily] = useState(true)
  const [includeSummary, setIncludeSummary] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Fetch report data
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/report?from=${fromDate}&to=${toDate}`)
      if (!res.ok) throw new Error('โหลดข้อมูลรายงานไม่สำเร็จ')
      return res.json() as Promise<ReportData>
    },
    enabled: !!(fromDate && toDate && fromDate <= toDate),
  })

  const summary = data?.summary
  const isValidRange = fromDate && toDate && fromDate <= toDate

  const handleGeneratePDF = async () => {
    if (!data) {
      toast.error('ยังไม่มีข้อมูลสำหรับสร้างรายงาน')
      return
    }
    if (!includeDaily && !includeSummary) {
      toast.error('ต้องเลือกอย่างน้อย 1 ประเภทเนื้อหา')
      return
    }
    setGenerating(true)
    try {
      const blob = await generateReportPDF(data, { includeDaily, includeSummary })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `สถิตินักเรียน_${fromDate}_ถึง_${toDate}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('สร้าง PDF สำเร็จ', {
        description: `ดาวน์โหลด ${data.daysWithRecords.length + (includeSummary ? 1 : 0)} หน้าแล้ว`,
      })
    } catch (err) {
      console.error(err)
      toast.error('สร้าง PDF ไม่สำเร็จ', { description: (err as Error).message })
    } finally {
      setGenerating(false)
    }
  }

  const handlePreset = (preset: typeof PRESETS[0]) => {
    const range = preset.getRange()
    setFromDate(range.from)
    setToDate(range.to)
  }

  const rate = summary && summary.totalStudents > 0 ? (summary.present / summary.totalStudents) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-emerald-100/80 shadow-sm">
        <CardHeader className="gap-3 border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-slate-800">
            <FileText className="h-4 w-4 text-emerald-600" />
            เลือกช่วงเวลาและเนื้อหารายงาน
          </CardTitle>
          <CardDescription className="text-xs">
            เลือกวันเริ่มต้น-สิ้นสุด หรือใช้ preset ด้านล่าง แล้วกด &quot;สร้าง PDF&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">เลือกแบบรวดเร็ว</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date inputs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="from" className="text-xs text-slate-600">
                <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                วันเริ่มต้น
              </Label>
              <Input
                id="from"
                type="date"
                max={toDate}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to" className="text-xs text-slate-600">
                <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                วันสิ้นสุด
              </Label>
              <Input
                id="to"
                type="date"
                max={today}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          {/* Invalid range warning */}
          {fromDate > toDate && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4" />
              วันเริ่มต้นต้องมาก่อนวันสิ้นสุด
            </div>
          )}

          {/* Content options */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">เนื้อหาใน PDF</Label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIncludeSummary((v) => !v)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  includeSummary
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                หน้าสรุปรวม + กราฟแนวโน้ม
              </button>
              <button
                onClick={() => setIncludeDaily((v) => !v)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  includeDaily
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                รายวัน (1 วัน = 1 หน้า)
              </button>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={handleGeneratePDF}
              disabled={!data || generating || !isValidRange || (!includeDaily && !includeSummary)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {generating ? 'กำลังสร้าง PDF...' : 'สร้างและดาวน์โหลด PDF'}
            </Button>
            <span className="text-xs text-slate-500">
              {data && (
                <>
                  จะสร้าง {data.daysWithRecords.length + (includeSummary ? 1 : 0)} หน้า
                  {' · '}
                  ขนาด A4 แนวนอน
                </>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Preview — Summary cards */}
      {isLoading && (
        <Card className="border-slate-200 p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">กำลังโหลดข้อมูลรายงาน...</p>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm text-red-600">โหลดข้อมูลรายงานไม่สำเร็จ</p>
          <p className="text-xs text-slate-500">{(error as Error).message}</p>
        </Card>
      )}

      {data && summary && (
        <>
          {/* Summary cards preview */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PreviewCard
              icon={<Clock className="h-4 w-4" />}
              label="วันที่บันทึก"
              value={formatNumber(summary.recordedDays)}
              sub={`จาก ${summary.totalDays} วันในช่วง`}
              gradient="from-slate-700 to-slate-900"
            />
            <PreviewCard
              icon={<Users className="h-4 w-4" />}
              label="รวมนักเรียนทั้งหมด"
              value={formatNumber(summary.totalStudents)}
              sub={`ชาย ${summary.totalMale} · หญิง ${summary.totalFemale}`}
              gradient="from-emerald-500 to-teal-600"
            />
            <PreviewCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="มาเรียนรวม"
              value={formatNumber(summary.present)}
              sub={`ชาย ${summary.presentMale} · หญิง ${summary.presentFemale} · ${rate.toFixed(1)}%`}
              gradient="from-emerald-600 to-green-700"
            />
            <PreviewCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="อัตราการมาเรียนเฉลี่ย"
              value={`${rate.toFixed(1)}%`}
              sub={rate >= 95 ? 'อยู่ในเกณฑ์ดีมาก' : rate >= 90 ? 'อยู่ในเกณฑ์ดี' : 'ควรปรับปรุง'}
              gradient="from-amber-500 to-orange-600"
            />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PreviewCard
              icon={<Stethoscope className="h-4 w-4" />}
              label="ป่วยรวม"
              value={formatNumber(summary.sick)}
              sub={`ชาย ${summary.sickMale} · หญิง ${summary.sickFemale}`}
              gradient="from-rose-500 to-red-600"
            />
            <PreviewCard
              icon={<Calendar className="h-4 w-4" />}
              label="ลารวม"
              value={formatNumber(summary.leave)}
              sub={`ชาย ${summary.leaveMale} · หญิง ${summary.leaveFemale}`}
              gradient="from-amber-500 to-yellow-600"
            />
            <PreviewCard
              icon={<AlertCircle className="h-4 w-4" />}
              label="ขาดรวม"
              value={formatNumber(summary.absent)}
              sub={`ชาย ${summary.absentMale} · หญิง ${summary.absentFemale}`}
              gradient="from-red-500 to-rose-700"
            />
          </div>

          {/* Days with data preview */}
          <Card className="border-emerald-100/80 shadow-sm">
            <CardHeader className="gap-2 border-b border-slate-100 pb-3">
              <CardTitle className="text-sm text-slate-800">
                พรีวิว: {data.daysWithRecords.length} วันที่จะอยู่ใน PDF
              </CardTitle>
              <CardDescription className="text-xs">
                แต่ละวันจะเป็น 1 หน้า A4 แนวนอน
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              {data.daysWithRecords.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  ไม่มีข้อมูลในช่วงที่เลือก — ลองเลือกช่วงวันที่อื่น
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.daysWithRecords.slice(0, 30).map((day) => {
                    const dayRecords = day.records
                    const dayTotal = dayRecords.reduce((s, r) => s + r.totalMale + r.totalFemale, 0)
                    const dayPresent = dayRecords.reduce((s, r) => s + r.presentMale + r.presentFemale, 0)
                    const dayRate = dayTotal > 0 ? (dayPresent / dayTotal) * 100 : 0
                    return (
                      <div
                        key={day.date}
                        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        title={`${formatThaiDate(day.date)} — มา ${dayPresent}/${dayTotal} (${dayRate.toFixed(0)}%)`}
                      >
                        <span className="font-medium text-slate-700">{formatThaiDateShort(day.date)}</span>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {dayRecords.length} ห้อง
                        </Badge>
                        <Badge
                          className={
                            dayRate >= 95
                              ? 'bg-emerald-100 text-emerald-700'
                              : dayRate >= 90
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {dayRate.toFixed(0)}%
                        </Badge>
                      </div>
                    )
                  })}
                  {data.daysWithRecords.length > 30 && (
                    <div className="px-2 py-1 text-xs text-slate-400">
                      ...และอีก {data.daysWithRecords.length - 30} วัน
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function PreviewCard({
  icon, label, value, sub, gradient,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  gradient: string
}) {
  return (
    <Card className={`relative overflow-hidden border-0 bg-gradient-to-br ${gradient} p-4 text-white shadow-md`}>
      <div className="absolute -right-3 -top-3 opacity-20">{icon}</div>
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider opacity-90">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        <div className="mt-0.5 text-[11px] opacity-90">{sub}</div>
      </div>
    </Card>
  )
}
