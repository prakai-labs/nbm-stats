'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, CalendarDays, Users, TrendingUp,
  CheckCircle2, Stethoscope, User, UserRound,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatThaiDate, formatNumber } from './utils'

interface CalendarDay {
  date: string
  day: number
  total: number
  present: number
  sick: number
  leave: number
  absent: number
  male: number
  female: number
  presentMale: number
  presentFemale: number
  rate: number
  classroomCount: number
  hasData: boolean
}

interface MonthSummary {
  year: number
  month: number
  totalStudents: number
  present: number
  sick: number
  leave: number
  absent: number
  male: number
  female: number
  recordedDays: number
  totalDays: number
  avgRate: number
}

interface CalendarViewProps {
  onSelectDate?: (date: string) => void
  initialDate?: string
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const THAI_DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']

function todayBangkok(): string {
  const now = new Date()
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return bangkok.toISOString().slice(0, 10)
}

function getMonthFromDate(dateStr: string): string {
  return dateStr.slice(0, 7) // YYYY-MM
}

export function CalendarView({ onSelectDate, initialDate }: CalendarViewProps) {
  const today = todayBangkok()
  const [currentMonth, setCurrentMonth] = useState<string>(
    initialDate ? getMonthFromDate(initialDate) : getMonthFromDate(today)
  )
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || today)

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/calendar?month=${currentMonth}`)
      return res.json()
    },
    refetchInterval: 30000,
  })

  const days: CalendarDay[] = data?.days ?? []
  const monthSummary: MonthSummary | undefined = data?.monthSummary

  // สร้างตารางปฏิทิน (รวมช่องว่างก่อนวันแรก)
  const calendarCells = useMemo(() => {
    if (days.length === 0) return []
    const firstDay = new Date(days[0].date + 'T00:00:00Z')
    const firstDayOfWeek = firstDay.getUTCDay() // 0=Sunday
    const cells: Array<CalendarDay | null> = []
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
    for (const d of days) cells.push(d)
    return cells
  }, [days])

  const currentYear = Number(currentMonth.split('-')[0])
  const currentMonthNum = Number(currentMonth.split('-')[1])
  const thaiYear = currentYear + 543

  const goToPrevMonth = () => {
    let m = currentMonthNum - 1
    let y = currentYear
    if (m < 1) { m = 12; y -= 1 }
    setCurrentMonth(`${y}-${String(m).padStart(2, '0')}`)
  }

  const goToNextMonth = () => {
    // ห้ามเลื่อนไปเดือนถัดไปเกินเดือนปัจจุบัน
    const todayMonth = getMonthFromDate(today)
    let m = currentMonthNum + 1
    let y = currentYear
    if (m > 12) { m = 1; y += 1 }
    const newMonth = `${y}-${String(m).padStart(2, '0')}`
    if (newMonth > todayMonth) return
    setCurrentMonth(newMonth)
  }

  const goToToday = () => {
    setCurrentMonth(getMonthFromDate(today))
    setSelectedDate(today)
    onSelectDate?.(today)
  }

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date)
    onSelectDate?.(day.date)
  }

  // หาสีพื้นหลังตามอัตราการมาเรียน
  const getDayColor = (day: CalendarDay | null): string => {
    if (!day || !day.hasData) return 'bg-slate-50 text-slate-300'
    const r = day.rate
    if (r >= 95) return 'bg-emerald-500 text-white'
    if (r >= 90) return 'bg-emerald-400 text-white'
    if (r >= 80) return 'bg-amber-400 text-white'
    if (r > 0) return 'bg-rose-400 text-white'
    return 'bg-slate-200 text-slate-500'
  }

  const isToday = (dateStr: string) => dateStr === today
  const isSelected = (dateStr: string) => dateStr === selectedDate
  const isFuture = (dateStr: string) => dateStr > today

  // ข้อมูลของวันที่เลือก
  const selectedDay = days.find((d) => d.date === selectedDate)

  return (
    <div className="space-y-4">
      {/* Month summary cards */}
      {monthSummary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white shadow-md">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider opacity-90">
              <TrendingUp className="h-3.5 w-3.5" />
              อัตราเฉลี่ยเดือน
            </div>
            <div className="mt-1 text-2xl font-bold">{monthSummary.avgRate.toFixed(1)}%</div>
            <div className="text-[11px] opacity-90">
              {monthSummary.recordedDays}/{monthSummary.totalDays} วันที่บันทึก
            </div>
          </Card>
          <Card className="border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <Users className="h-3.5 w-3.5" />
              รวมนักเรียนเดือน
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-800">
              {formatNumber(monthSummary.totalStudents)}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="text-sky-600">ชาย {monthSummary.male}</span>
              <span className="text-pink-600">หญิง {monthSummary.female}</span>
            </div>
          </Card>
          <Card className="border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              มาเรียนรวม
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {formatNumber(monthSummary.present)}
            </div>
            <div className="text-[11px] text-slate-500">
              {monthSummary.totalStudents > 0
                ? `${((monthSummary.present / monthSummary.totalStudents) * 100).toFixed(1)}% ของทั้งหมด`
                : '—'}
            </div>
          </Card>
          <Card className="border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <Stethoscope className="h-3.5 w-3.5 text-rose-500" />
              ป่วย/ลา/ขาด
            </div>
            <div className="mt-1 text-2xl font-bold text-rose-700">
              {formatNumber(monthSummary.sick + monthSummary.leave + monthSummary.absent)}
            </div>
            <div className="text-[11px] text-slate-500">
              ป่วย {monthSummary.sick} · ลา {monthSummary.leave} · ขาด {monthSummary.absent}
            </div>
          </Card>
        </div>
      )}

      {/* Calendar grid */}
      <Card className="border-emerald-100/80 shadow-sm">
        <CardHeader className="gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                {THAI_MONTHS[currentMonthNum - 1]} {thaiYear}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToPrevMonth} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 px-3 text-xs">
                วันนี้
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                disabled={currentMonth >= getMonthFromDate(today)}
                className="h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            คลิกวันที่ใดๆ เพื่อดูรายละเอียด — สีแสดงอัตราการมาเรียน: เขียว=ดีมาก (≥95%) · เขียวอ่อน=ดี (≥90%) · เหลือง=ปานกลาง (≥80%) · แดง=ต่ำ
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {/* Day-of-week header */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {THAI_DAYS_SHORT.map((d, i) => (
              <div
                key={d}
                className={`py-1 text-center text-xs font-semibold ${
                  i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-600' : 'text-slate-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              กำลังโหลดปฏิทิน...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="aspect-square" />
                }
                const colorClass = getDayColor(day)
                const selected = isSelected(day.date)
                const today_ = isToday(day.date)
                const future = isFuture(day.date)
                return (
                  <button
                    key={day.date}
                    onClick={() => !future && handleDayClick(day)}
                    disabled={future}
                    className={`relative aspect-square rounded-lg p-1.5 text-left transition-all ${
                      colorClass
                    } ${selected ? 'ring-2 ring-emerald-700 ring-offset-1' : ''} ${
                      today_ ? 'ring-1 ring-emerald-500' : ''
                    } ${future ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 hover:shadow-md cursor-pointer'}`}
                    title={day.hasData ? `${formatThaiDate(day.date)} — มา ${day.present}/${day.total} (${day.rate.toFixed(0)}%)` : formatThaiDate(day.date)}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-sm font-bold ${day.hasData ? '' : 'text-slate-400'}`}>
                        {day.day}
                      </span>
                      {today_ && (
                        <span className="text-[9px] font-semibold uppercase opacity-75">วันนี้</span>
                      )}
                    </div>
                    {day.hasData && (
                      <div className="mt-0.5 text-[10px] leading-tight opacity-95">
                        <div>มา {day.present}/{day.total}</div>
                        <div>{day.rate.toFixed(0)}% · {day.classroomCount}ห้อง</div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-[11px]">
            <span className="text-slate-500">สี:</span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-emerald-500" /> ≥95%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-emerald-400" /> ≥90%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-amber-400" /> ≥80%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-rose-400" /> &lt;80%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-slate-50 ring-1 ring-slate-200" /> ยังไม่บันทึก
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDay && (
        <Card className="border-emerald-100/80 shadow-sm">
          <CardHeader className="gap-2 border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-slate-800">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              รายละเอียดวันที่เลือก
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {formatThaiDate(selectedDay.date)} (วัน{THAI_DAYS_FULL[new Date(selectedDay.date + 'T00:00:00Z').getUTCDay()]})
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {selectedDay.hasData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <DetailBox label="ทั้งหมด" value={selectedDay.total} color="slate" />
                  <DetailBox label="ชาย" value={selectedDay.male} color="sky" />
                  <DetailBox label="หญิง" value={selectedDay.female} color="pink" />
                  <DetailBox label="มา" value={selectedDay.present} color="emerald" />
                  <DetailBox label="ป่วย" value={selectedDay.sick} color="rose" />
                  <DetailBox label="ลา" value={selectedDay.leave} color="amber" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                    <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-sky-700">
                      <User className="h-3 w-3" /> ชายมา
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-sky-700">
                      {selectedDay.presentMale}/{selectedDay.male}
                    </div>
                  </div>
                  <div className="rounded-lg border border-pink-100 bg-pink-50 p-3">
                    <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-pink-700">
                      <UserRound className="h-3 w-3" /> หญิงมา
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-pink-700">
                      {selectedDay.presentFemale}/{selectedDay.female}
                    </div>
                  </div>
                  <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-rose-600">
                      ขาดเรียน
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-rose-600">{selectedDay.absent}</div>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-700">
                      อัตราการมา
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-emerald-700">
                      {selectedDay.rate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                  <span className="text-slate-500">จำนวนห้องที่บันทึก: <strong>{selectedDay.classroomCount}</strong> ห้อง</span>
                  <Button
                    size="sm"
                    onClick={() => onSelectDate?.(selectedDay.date)}
                    className="h-7 bg-emerald-600 px-2.5 text-[11px] hover:bg-emerald-700"
                  >
                    ดูฟอร์มบันทึกวันนี้ →
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CalendarDays className="h-10 w-10 text-slate-300" />
                <div className="text-sm text-slate-500">
                  ยังไม่มีข้อมูลสำหรับวันที่ {formatThaiDate(selectedDay.date)}
                </div>
                {selectedDay.date <= today && (
                  <Button
                    size="sm"
                    onClick={() => onSelectDate?.(selectedDay.date)}
                    className="h-8 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
                  >
                    ไปบันทึกวันนี้ →
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DetailBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    slate: { text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
    sky: { text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
    pink: { text: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
    emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    rose: { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
    amber: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  }
  const c = colorMap[color] ?? colorMap.slate
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-2 text-center`}>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${c.text}`}>{formatNumber(value)}</div>
    </div>
  )
}
