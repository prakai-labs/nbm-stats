'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  GraduationCap, CalendarDays, Loader2, FileSpreadsheet,
  Users, CheckCircle2, Stethoscope, AlertCircle, Calendar,
  ArrowRight, ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatThaiDate, formatThaiDateShort, todayBangkok, formatNumber } from './utils'

interface Classroom {
  id: string
  code: string
  name: string
  level: string
  sortOrder: number
  defaultMale: number
  defaultFemale: number
}

interface AttendanceRecord {
  id: string
  date: string
  classroomId: string
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
  updatedAt: string
}

interface HistoryResponse {
  classroom: Classroom
  records: AttendanceRecord[]
  summary: {
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
    rate: number
  }
}

interface ClassroomHistoryViewProps {
  onSelectDate?: (date: string) => void
}

export function ClassroomHistoryView({ onSelectDate }: ClassroomHistoryViewProps) {
  const today = useMemo(() => todayBangkok(), [])

  // 1. Fetch Classrooms
  const { data: classroomsData, isLoading: loadingClassrooms } = useQuery<{ classrooms: Classroom[] }>({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const res = await fetch('/api/classrooms')
      if (!res.ok) throw new Error('โหลดรายชื่อห้องเรียนไม่สำเร็จ')
      return res.json()
    }
  })

  const classrooms = classroomsData?.classrooms ?? []
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('')

  // Set default selected classroom to first classroom (e.g. อ.1 or ป.1)
  useEffect(() => {
    if (!selectedClassroomId && classrooms.length > 0) {
      setSelectedClassroomId(classrooms[0].id)
    }
  }, [classrooms, selectedClassroomId])

  // 2. Fetch Semester Settings to determine term start
  const { data: semesterSettings } = useQuery({
    queryKey: ['semesterSettings'],
    queryFn: async () => {
      const res = await fetch('/api/settings/semester')
      if (!res.ok) return null
      return res.json()
    }
  })

  // Determine active term start date
  const termStartDate = useMemo(() => {
    if (!semesterSettings) return `${new Date().getFullYear()}-05-16`
    const now = new Date(today)
    now.setHours(0, 0, 0, 0)

    const term1Start = semesterSettings.term1?.start ? new Date(semesterSettings.term1.start) : null
    const term1End = semesterSettings.term1?.end ? new Date(semesterSettings.term1.end) : null
    const term2Start = semesterSettings.term2?.start ? new Date(semesterSettings.term2.start) : null
    const term2End = semesterSettings.term2?.end ? new Date(semesterSettings.term2.end) : null

    if (term2Start && term2End && now >= term2Start && now <= term2End) {
      return semesterSettings.term2.start
    }
    if (term1Start && term1End && now >= term1Start && now <= term1End) {
      return semesterSettings.term1.start
    }
    if (term1Start) {
      return semesterSettings.term1.start
    }
    return `${new Date().getFullYear()}-05-16`
  }, [semesterSettings, today])

  const [fromDate, setFromDate] = useState<string>(termStartDate)
  const [toDate, setToDate] = useState<string>(today)

  // Update fromDate once semesterSettings are loaded if user hasn't changed it yet
  useEffect(() => {
    if (termStartDate) {
      setFromDate(termStartDate)
    }
  }, [termStartDate])

  // 3. Fetch History Data for selected classroom
  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ['classroom-history', selectedClassroomId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/classroom-history?classroomId=${selectedClassroomId}&from=${fromDate}&to=${toDate}`)
      if (!res.ok) throw new Error('โหลดข้อมูลประวัติไม่สำเร็จ')
      return res.json()
    },
    enabled: !!selectedClassroomId && !!fromDate && !!toDate && fromDate <= toDate,
  })

  const currentClassroom = useMemo(() => {
    return classrooms.find(c => c.id === selectedClassroomId)
  }, [classrooms, selectedClassroomId])

  const summary = data?.summary
  const records = data?.records ?? []

  const handleExportExcel = () => {
    if (!selectedClassroomId) return
    window.open(`/api/export-excel?from=${fromDate}&to=${toDate}&classroomId=${selectedClassroomId}`)
  }

  const handlePreset = (type: 'term' | 'month' | '30days' | 'all') => {
    if (type === 'term') {
      setFromDate(termStartDate)
      setToDate(today)
    } else if (type === 'month') {
      const y = today.slice(0, 4)
      const m = today.slice(5, 7)
      setFromDate(`${y}-${m}-01`)
      setToDate(today)
    } else if (type === '30days') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      setFromDate(d.toISOString().slice(0, 10))
      setToDate(today)
    } else if (type === 'all') {
      setFromDate(`${new Date().getFullYear()}-05-01`)
      setToDate(today)
    }
  }

  const Pill = ({ male, female, color }: { male: number; female: number; color: string }) => (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${color}`}>
      <span className="text-sky-700 font-semibold">ช{male}</span>
      <span className="text-pink-700 font-semibold">ญ{female}</span>
    </span>
  )

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <Card className="border-emerald-100/80 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
                รายงานสถิติย้อนหลังรายห้องเรียน
              </CardTitle>
              <CardDescription className="text-xs">
                เลือกชั้นเรียนและช่วงเวลาเพื่อตรวจสอบประวัติการบันทึกสถิติแบบรายวัน
              </CardDescription>
            </div>
            {selectedClassroomId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 self-start sm:self-auto"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export Excel ({currentClassroom?.code})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Classroom Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">เลือกชั้นเรียน</Label>
            {loadingClassrooms ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายชื่อห้องเรียน...
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {classrooms.map((c) => {
                  const isSelected = c.id === selectedClassroomId
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClassroomId(c.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 ring-offset-1 font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {c.code}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Date Range & Presets */}
          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-100 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs text-slate-600 flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                วันเริ่มต้น (ตั้งแต่)
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
            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs text-slate-600 flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                วันสิ้นสุด (ถึงวันที่)
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
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-slate-600">เลือกช่วงเวลาด่วน</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('term')}
                  className="text-xs h-9 px-2.5"
                >
                  ตั้งแต่เปิดเทอม
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('month')}
                  className="text-xs h-9 px-2.5"
                >
                  เดือนนี้
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('30days')}
                  className="text-xs h-9 px-2.5"
                >
                  30 วันล่าสุด
                </Button>
              </div>
            </div>
          </div>

          {fromDate > toDate && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              วันเริ่มต้นต้องมาก่อนหรือตรงกับวันสิ้นสุด
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <Card className="border-slate-200 p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">กำลังโหลดข้อมูลสถิติของห้อง {currentClassroom?.name || ''}...</p>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm text-red-600">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="text-xs text-slate-500">{(error as Error).message}</p>
        </Card>
      )}

      {/* Summary Cards */}
      {!isLoading && summary && currentClassroom && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 bg-gradient-to-br from-slate-700 to-slate-900 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200 uppercase">วันที่บันทึกแล้ว</span>
                <Calendar className="h-4 w-4 text-slate-300" />
              </div>
              <div className="mt-2 text-2xl font-bold">{formatNumber(summary.recordedDays)} วัน</div>
              <div className="mt-1 text-[11px] text-slate-300">
                นักเรียนประจำชั้น: ชาย {currentClassroom.defaultMale} · หญิง {currentClassroom.defaultFemale} (รวม {currentClassroom.defaultMale + currentClassroom.defaultFemale})
              </div>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-100 uppercase">มาเรียนเฉลี่ย</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              </div>
              <div className="mt-2 text-2xl font-bold">{summary.rate.toFixed(1)}%</div>
              <div className="mt-1 text-[11px] text-emerald-100">
                มาเรียนรวม {formatNumber(summary.present)} ครั้ง ({summary.rate >= 95 ? 'ดีเยี่ยม' : summary.rate >= 90 ? 'ปกติ' : 'ต้องติดตาม'})
              </div>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-rose-500 to-red-600 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-100 uppercase">ป่วยสะสม</span>
                <Stethoscope className="h-4 w-4 text-rose-200" />
              </div>
              <div className="mt-2 text-2xl font-bold">{formatNumber(summary.sick)} ครั้ง</div>
              <div className="mt-1 text-[11px] text-rose-100">
                ชาย {summary.sickMale} · หญิง {summary.sickFemale}
              </div>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-100 uppercase">ลา / ขาด สะสม</span>
                <AlertCircle className="h-4 w-4 text-amber-200" />
              </div>
              <div className="mt-2 text-2xl font-bold">{formatNumber(summary.leave + summary.absent)} ครั้ง</div>
              <div className="mt-1 text-[11px] text-amber-100">
                ลา {summary.leave} ครั้ง · ขาด {summary.absent} ครั้ง
              </div>
            </Card>
          </div>

          {/* Table Card */}
          <Card className="border-emerald-100/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>ประวัติรายวัน: {currentClassroom.name} ({currentClassroom.code})</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {records.length} วัน
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  คลิกที่แถวหรือปุ่มด้านขวา เพื่อเปิดดูหรือแก้ไขข้อมูลในหน้ารายวัน
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {records.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  ไม่มีประวัติการบันทึกสถิติในช่วงเวลาที่เลือก
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-600 font-semibold">
                        <th className="py-3 px-3">วันที่</th>
                        <th className="py-3 px-2 text-center">นักเรียนทั้งหมด</th>
                        <th className="py-3 px-2 text-center">มาเรียน</th>
                        <th className="py-3 px-2 text-center">ป่วย</th>
                        <th className="py-3 px-2 text-center">ลา</th>
                        <th className="py-3 px-2 text-center">ขาด</th>
                        <th className="py-3 px-2 text-center">% มาเรียน</th>
                        <th className="py-3 px-3">ผู้บันทึก / หมายเหตุ</th>
                        <th className="py-3 px-3 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((r) => {
                        const total = r.totalMale + r.totalFemale
                        const present = r.presentMale + r.presentFemale
                        const sick = r.sickMale + r.sickFemale
                        const leave = r.leaveMale + r.leaveFemale
                        const absent = r.absentMale + r.absentFemale
                        const rate = total > 0 ? (present / total) * 100 : 0

                        return (
                          <tr
                            key={r.id}
                            onClick={() => onSelectDate?.(r.date)}
                            className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                              <div>{formatThaiDate(r.date)}</div>
                              <div className="text-[10px] text-slate-400 sm:hidden">{r.date}</div>
                            </td>

                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <div className="font-semibold text-slate-700">{total} คน</div>
                              <Pill male={r.totalMale} female={r.totalFemale} color="bg-slate-100" />
                            </td>

                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <div className="font-semibold text-emerald-700">{present} คน</div>
                              <Pill male={r.presentMale} female={r.presentFemale} color="bg-emerald-50" />
                            </td>

                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              {sick > 0 ? (
                                <>
                                  <div className="font-semibold text-rose-600">{sick}</div>
                                  <Pill male={r.sickMale} female={r.sickFemale} color="bg-rose-50" />
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              {leave > 0 ? (
                                <>
                                  <div className="font-semibold text-amber-600">{leave}</div>
                                  <Pill male={r.leaveMale} female={r.leaveFemale} color="bg-amber-50" />
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              {absent > 0 ? (
                                <>
                                  <div className="font-semibold text-red-600">{absent}</div>
                                  <Pill male={r.absentMale} female={r.absentFemale} color="bg-red-50" />
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <Badge
                                className={
                                  rate >= 95
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                    : rate >= 90
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                    : 'bg-red-100 text-red-700 hover:bg-red-100'
                                }
                              >
                                {rate.toFixed(1)}%
                              </Badge>
                            </td>

                            <td className="py-3 px-3 text-slate-600 max-w-[180px]">
                              {r.recordedBy && (
                                <div className="text-slate-700 font-medium truncate" title={r.recordedBy}>
                                  ครู: {r.recordedBy}
                                </div>
                              )}
                              {r.note && (
                                <div className="text-slate-500 text-[11px] truncate italic" title={r.note}>
                                  {r.note}
                                </div>
                              )}
                              {!r.recordedBy && !r.note && <span className="text-slate-300">-</span>}
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectDate?.(r.date)
                                }}
                                className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-100 group-hover:bg-emerald-100"
                              >
                                <span>ดู/แก้ไข</span>
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
