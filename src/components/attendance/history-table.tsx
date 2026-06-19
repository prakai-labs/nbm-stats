'use client'

import { useQuery } from '@tanstack/react-query'
import { History, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatThaiDateShort } from './utils'

interface AttendanceRecord {
  id: string
  date: string
  classroomId: string
  classroom: { id: string; code: string; name: string; level: string; sortOrder: number }
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

export function HistoryTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch('/api/attendance')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const records: AttendanceRecord[] = data?.records ?? []
  const byDate = new Map<string, AttendanceRecord[]>()
  for (const r of records) {
    if (!byDate.has(r.date)) byDate.set(r.date, [])
    byDate.get(r.date)!.push(r)
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : -1))

  return (
    <Card className="border-emerald-100/80 shadow-sm">
      <CardHeader className="gap-2 border-b border-slate-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
          <History className="h-4 w-4 text-emerald-600" />
          ประวัติการบันทึก
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          รายการบันทึกล่าสุด 90 วัน (เรียงตามวันที่) — แสดงแยกชาย/หญิง
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[460px]">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              กำลังโหลด...
            </div>
          ) : records.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              ยังไม่มีข้อมูลในระบบ
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dates.slice(0, 30).map((date) => {
                const dayRecords = byDate.get(date)!.sort((a, b) => a.classroom.sortOrder - b.classroom.sortOrder)
                const agg = dayRecords.reduce((acc, r) => ({
                  totalMale: acc.totalMale + r.totalMale,
                  totalFemale: acc.totalFemale + r.totalFemale,
                  presentMale: acc.presentMale + r.presentMale,
                  presentFemale: acc.presentFemale + r.presentFemale,
                  sickMale: acc.sickMale + r.sickMale,
                  sickFemale: acc.sickFemale + r.sickFemale,
                  leaveMale: acc.leaveMale + r.leaveMale,
                  leaveFemale: acc.leaveFemale + r.leaveFemale,
                  absentMale: acc.absentMale + r.absentMale,
                  absentFemale: acc.absentFemale + r.absentFemale,
                }), {
                  totalMale: 0, totalFemale: 0,
                  presentMale: 0, presentFemale: 0,
                  sickMale: 0, sickFemale: 0,
                  leaveMale: 0, leaveFemale: 0,
                  absentMale: 0, absentFemale: 0,
                })
                const total = agg.totalMale + agg.totalFemale
                const present = agg.presentMale + agg.presentFemale
                const sick = agg.sickMale + agg.sickFemale
                const leave = agg.leaveMale + agg.leaveFemale
                const absent = agg.absentMale + agg.absentFemale
                const rate = total > 0 ? (present / total) * 100 : 0

                const Pill = ({ male, female, color }: { male: number; female: number; color: string }) => (
                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${color}`}>
                    <span className="text-sky-700">ช{male}</span>
                    <span className="text-pink-700">ญ{female}</span>
                  </span>
                )

                return (
                  <div key={date} className="px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                          {dayRecords.length}
                        </div>
                        <div className="text-sm font-semibold text-slate-700">
                          {formatThaiDateShort(date)}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
                          {dayRecords.length} ห้อง
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Pill male={agg.totalMale} female={agg.totalFemale} color="bg-slate-100 text-slate-600" />
                        <span className="text-slate-600">รวม {total}</span>
                        <Pill male={agg.presentMale} female={agg.presentFemale} color="bg-emerald-50 text-emerald-700" />
                        <span className="text-emerald-700">มา {present}</span>
                        <Pill male={agg.sickMale} female={agg.sickFemale} color="bg-rose-50 text-rose-700" />
                        <span className="text-rose-600">ป่วย {sick}</span>
                        <Pill male={agg.leaveMale} female={agg.leaveFemale} color="bg-amber-50 text-amber-700" />
                        <span className="text-amber-600">ลา {leave}</span>
                        <Pill male={agg.absentMale} female={agg.absentFemale} color="bg-red-50 text-red-700" />
                        <span className="text-red-600">ขาด {absent}</span>
                        <Badge
                          className={
                            rate >= 95
                              ? 'bg-emerald-100 text-emerald-700'
                              : rate >= 90
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {rate.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dayRecords.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
                          title={`${r.classroom.code} ${r.classroom.name} — ชาย ${r.totalMale}/หญิง ${r.totalFemale}, มา ช${r.presentMale}/ญ${r.presentFemale} ${
                            r.recordedBy ? `โดย ${r.recordedBy}` : ''
                          }`}
                        >
                          <span className="font-semibold text-slate-700">{r.classroom.code}</span>
                          <span className="text-sky-600">ช{r.totalMale}</span>
                          <span className="text-pink-600">ญ{r.totalFemale}</span>
                          <span className="text-emerald-700">มา{r.presentMale + r.presentFemale}</span>
                          {(r.sickMale + r.sickFemale) > 0 && (
                            <span className="text-rose-500">ป่วย {r.sickMale + r.sickFemale}</span>
                          )}
                          {(r.leaveMale + r.leaveFemale) > 0 && (
                            <span className="text-amber-500">ลา {r.leaveMale + r.leaveFemale}</span>
                          )}
                          {(r.absentMale + r.absentFemale) > 0 && (
                            <span className="text-red-500">ขาด {r.absentMale + r.absentFemale}</span>
                          )}
                          {r.recordedBy && (
                            <span className="inline-flex items-center gap-0.5 text-slate-400">
                              <User className="h-2.5 w-2.5" />
                              {r.recordedBy}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
