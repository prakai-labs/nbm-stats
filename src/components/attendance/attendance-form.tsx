'use client'

import { useMemo, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Save,
  RotateCcw,
  Lock,
  UserCog,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatThaiDate, todayBangkok } from './utils'
import { EditingSlot } from './use-socket-sync'

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
  classroom: Classroom
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
  createdAt: string
  updatedAt: string
}

interface AttendanceFormProps {
  date: string
  onDateChange: (d: string) => void
  teacherName: string
  onTeacherNameChange: (n: string) => void
  editingSlots: EditingSlot[]
  currentUserId: string | null
  onStartEditing: (date: string, classroomId: string) => void
  onStopEditing: (date: string, classroomId: string) => void
  onSaved: (date: string, classroomId: string) => void
  isAdmin?: boolean
}

interface RowState {
  totalMale: string
  totalFemale: string
  sickMale: string
  sickFemale: string
  leaveMale: string
  leaveFemale: string
  absentMale: string
  absentFemale: string
  note: string
}

const emptyRow: RowState = {
  totalMale: '', totalFemale: '',
  sickMale: '', sickFemale: '',
  leaveMale: '', leaveFemale: '',
  absentMale: '', absentFemale: '',
  note: '',
}


// Copy from previous day button
function CopyFromPrevious({ currentDate, classrooms, setEdits, teacherName, onStartEditing, editingClassroomIds, setEditingClassroomIds }: {
  currentDate: string
  classrooms: Classroom[]
  setEdits: React.Dispatch<React.SetStateAction<Record<string, Partial<RowState>>>>
  teacherName: string
  onStartEditing: (date: string, classroomId: string) => void
    editingClassroomIds: Set<string>
  setEditingClassroomIds: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleCopy = async () => {
    setIsLoading(true)
    try {
      // Fetch last 30 days of attendance
      const res = await fetch('/api/attendance')
      const data = await res.json()
      const records: AttendanceRecord[] = data?.records ?? []

      // Find most recent date with data (excluding currentDate)
      const dates = [...new Set(records.map(r => r.date))].sort((a, b) => b.localeCompare(a))
      const prevDate = dates.find(d => d !== currentDate)

      if (!prevDate) {
        toast.error('ไม่พบข้อมูลวันที่ผ่านมา')
        setIsLoading(false)
        return
      }

      // Get records for that date
      const prevRecords = records.filter(r => r.date === prevDate)
      const newEdits: Record<string, Partial<RowState>> = {}

      for (const c of classrooms) {
        const prev = prevRecords.find(r => r.classroomId === c.id)
        if (prev) {
          newEdits[c.id] = {
            totalMale: String(prev.totalMale),
            totalFemale: String(prev.totalFemale),
            sickMale: String(prev.sickMale),
            sickFemale: String(prev.sickFemale),
            leaveMale: String(prev.leaveMale),
            leaveFemale: String(prev.leaveFemale),
            absentMale: String(prev.absentMale),
            absentFemale: String(prev.absentFemale),
            note: prev.note ?? '',
          }
          // Mark as editing
          onStartEditing(currentDate, c.id)
        }
      }

      setEdits(newEdits)
      // Add all classroom IDs to editing set
      const newSet = new Set(editingClassroomIds)
      for (const c of classrooms) {
        if (newEdits[c.id]) newSet.add(c.id)
      }
      setEditingClassroomIds(newSet)

      toast.success(`คัดลอกข้อมูลจาก ${prevDate} แล้ว`, {
        description: `${Object.keys(newEdits).length} ห้องเรียน`,
      })
    } catch {
      toast.error('คัดลอกไม่สำเร็จ')
    }
    setIsLoading(false)
  }

  return (
    <div className="flex items-center gap-2 px-1 pb-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        disabled={isLoading}
        className="h-7 gap-1 border-emerald-200 bg-emerald-50/50 text-xs text-emerald-700 hover:bg-emerald-100"
      >
        <RotateCcw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        คัดลอกข้อมูลจากครั้งก่อน
      </Button>
    </div>
  )
}
export function AttendanceForm({
  date,
  onDateChange,
  teacherName,
  onTeacherNameChange,
  editingSlots,
  currentUserId,
  onStartEditing,
  onStopEditing,
  onSaved,
  isAdmin,
}: AttendanceFormProps) {
  const queryClient = useQueryClient()
  const todayStr = todayBangkok()

  const { data: classroomsData } = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const res = await fetch('/api/classrooms')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
  const classrooms: Classroom[] = classroomsData?.classrooms ?? []

  const { data: recordsData } = useQuery({
    queryKey: ['attendance', date],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?date=${date}`)
      return res.json()
    },
    refetchInterval: 15000,
  })
  const records: AttendanceRecord[] = recordsData?.records ?? []

  const [edits, setEdits] = useState<Record<string, Partial<RowState>>>({})
  const [editingClassroomIds, setEditingClassroomIds] = useState<Set<string>>(new Set())

  const recordByClass = useMemo(() => {
    const m = new Map<string, AttendanceRecord>()
    for (const r of records) m.set(r.classroomId, r)
    return m
  }, [records])

  const getRowState = useCallback(
    (classroomId: string): RowState => {
      const r = recordByClass.get(classroomId)
      const c = classrooms.find(x => x.id === classroomId)
      const e = edits[classroomId] ?? {}
      return {
        totalMale: e.totalMale ?? (r ? String(r.totalMale) : String(c?.defaultMale || '')),
        totalFemale: e.totalFemale ?? (r ? String(r.totalFemale) : String(c?.defaultFemale || '')),
        sickMale: e.sickMale ?? (r ? String(r.sickMale) : ''),
        sickFemale: e.sickFemale ?? (r ? String(r.sickFemale) : ''),
        leaveMale: e.leaveMale ?? (r ? String(r.leaveMale) : ''),
        leaveFemale: e.leaveFemale ?? (r ? String(r.leaveFemale) : ''),
        absentMale: e.absentMale ?? (r ? String(r.absentMale) : ''),
        absentFemale: e.absentFemale ?? (r ? String(r.absentFemale) : ''),
        note: e.note ?? (r?.note ?? ''),
      }
    },
    [recordByClass, edits, classrooms]
  )

  const totalByClass = useCallback(
    (classroomId: string) => {
      const r = getRowState(classroomId)
      const male = Number(r.totalMale) || 0
      const female = Number(r.totalFemale) || 0
      const sM = Number(r.sickMale) || 0
      const sF = Number(r.sickFemale) || 0
      const lM = Number(r.leaveMale) || 0
      const lF = Number(r.leaveFemale) || 0
      const aM = Number(r.absentMale) || 0
      const aF = Number(r.absentFemale) || 0
      const presentMale = Math.max(0, male - sM - lM - aM)
      const presentFemale = Math.max(0, female - sF - lF - aF)
      return {
        male, female, total: male + female,
        sM, sF, sick: sM + sF,
        lM, lF, leave: lM + lF,
        aM, aF, absent: aM + aF,
        presentMale, presentFemale, present: presentMale + presentFemale,
        overLimitMale: sM + lM + aM > male,
        overLimitFemale: sF + lF + aF > female,
      }
    },
    [getRowState]
  )

  const saveMutation = useMutation({
    mutationFn: async (classroomId: string) => {
      const r = getRowState(classroomId)
      const body = {
        date,
        classroomId,
        totalMale: Number(r.totalMale) || 0,
        totalFemale: Number(r.totalFemale) || 0,
        sickMale: Number(r.sickMale) || 0,
        sickFemale: Number(r.sickFemale) || 0,
        leaveMale: Number(r.leaveMale) || 0,
        leaveFemale: Number(r.leaveFemale) || 0,
        absentMale: Number(r.absentMale) || 0,
        absentFemale: Number(r.absentFemale) || 0,
        note: r.note || null,
        recordedBy: teacherName.trim() || 'ไม่ระบุชื่อ',
      }
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'บันทึกไม่สำเร็จ')
      }
      return res.json()
    },
    onSuccess: (_data, classroomId) => {
      const classroom = classrooms.find((c) => c.id === classroomId)
      toast.success(`บันทึกข้อมูล ${classroom?.code} แล้ว`, {
        description: `โดย ${teacherName || 'คุณครู'}`,
      })
      onSaved(date, classroomId)
      onStopEditing(date, classroomId)
      setEditingClassroomIds((prev) => {
        const n = new Set(prev)
        n.delete(classroomId)
        return n
      })
      setEdits((prev) => {
        if (!prev[classroomId]) return prev
        const next = { ...prev }
        delete next[classroomId]
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['attendance', date] })
      queryClient.invalidateQueries({ queryKey: ['summary', date] })
      queryClient.invalidateQueries({ queryKey: ['trends'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
    onError: (err: Error) => {
      toast.error('บันทึกไม่สำเร็จ', { description: err.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await fetch(`/api/attendance?id=${recordId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('ลบไม่สำเร็จ')
      return res.json()
    },
    onSuccess: () => {
      toast.success('ล้างข้อมูลห้องนี้แล้ว')
      queryClient.invalidateQueries({ queryKey: ['attendance', date] })
      queryClient.invalidateQueries({ queryKey: ['summary', date] })
      queryClient.invalidateQueries({ queryKey: ['trends'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
    onError: () => toast.error('ลบไม่สำเร็จ'),
  })

  const handleFieldFocus = (classroomId: string) => {
    if (!editingClassroomIds.has(classroomId)) {
      onStartEditing(date, classroomId)
      setEditingClassroomIds((prev) => new Set(prev).add(classroomId))
    }
  }

  const handleFieldBlur = (classroomId: string) => {
    setTimeout(() => {
      const stillFocused = document.activeElement?.closest(`[data-row-id="${classroomId}"]`)
      if (!stillFocused) {
        onStopEditing(date, classroomId)
        setEditingClassroomIds((prev) => {
          const n = new Set(prev)
          n.delete(classroomId)
          return n
        })
      }
    }, 200)
  }

  const updateField = (classroomId: string, field: keyof RowState, value: string) => {
    if (field !== 'note') {
      const v = value.replace(/[^0-9]/g, '').slice(0, 4)
      setEdits((prev) => ({
        ...prev,
        [classroomId]: { ...prev[classroomId], [field]: v },
      }))
    } else {
      setEdits((prev) => ({
        ...prev,
        [classroomId]: { ...prev[classroomId], note: value },
      }))
    }
  }

  const resetRow = (classroomId: string) => {
    setEdits((prev) => {
      const next = { ...prev }
      delete next[classroomId]
      return next
    })
    const r = recordByClass.get(classroomId)
    if (r) {
      deleteMutation.mutate(r.id)
    }
  }

  const groupedClassrooms = useMemo(() => {
    const groups: Record<string, Classroom[]> = {}
    for (const c of classrooms) {
      if (!groups[c.level]) groups[c.level] = []
      groups[c.level].push(c)
    }
    const ordered: { level: string; classrooms: Classroom[] }[] = []
    for (const level of ['อนุบาล', 'ประถม', 'มัธยมต้น']) {
      if (groups[level]) ordered.push({ level, classrooms: groups[level] })
    }
    return ordered
  }, [classrooms])

  const totalSummary = useMemo(() => {
    let male = 0, female = 0
    let sM = 0, sF = 0, lM = 0, lF = 0, aM = 0, aF = 0
    let pM = 0, pF = 0
    for (const c of classrooms) {
      const r = totalByClass(c.id)
      male += r.male
      female += r.female
      sM += r.sM; sF += r.sF
      lM += r.lM; lF += r.lF
      aM += r.aM; aF += r.aF
      pM += r.presentMale; pF += r.presentFemale
    }
    return {
      male, female, total: male + female,
      sM, sF, sick: sM + sF,
      lM, lF, leave: lM + lF,
      aM, aF, absent: aM + aF,
      pM, pF, present: pM + pF,
    }
  }, [classrooms, totalByClass])

  const slotKey = (cid: string) => editingSlots.find((s) => s.date === date && s.classroomId === cid)

  return (
    <Card className="border-emerald-100/80 shadow-sm">
      <CardHeader className="gap-4 border-b border-slate-100 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              บันทึกสถิตินักเรียนประจำวัน
            </CardTitle>
            <CardDescription className="mt-1 text-slate-500">
              เลือกวันที่บันทึก แล้วกรอกจำนวนนักเรียนชาย/หญิง และจำนวนที่ป่วย/ลา/ขาด แยกชาย-หญิง ระบบจะคำนวณจำนวนที่มาให้เอง — ชื่อผู้บันทึกใช้จากบัญชี Google ที่ล็อกอิน
            </CardDescription>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="date" className="text-xs text-slate-600">
                <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                วันที่บันทึก
              </Label>
              <Input
                id="date"
                type="date"
                max={todayStr}
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="h-9 w-full bg-white lg:w-44"
              />
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          {formatThaiDate(date)}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Form table — scrollable both directions with sticky header */}
        <div className="overflow-auto max-h-[calc(100vh-340px)] min-h-[400px]">
          <table className="w-full min-w-[1320px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-center text-xs uppercase tracking-wide text-slate-600">
                <th className="px-1 py-3 text-center font-semibold sticky left-0 top-0 z-[20] bg-slate-50" rowSpan={2}>บันทึก/ชั้น</th>
                <th className="px-3 py-3 text-left font-semibold min-w-[200px]" rowSpan={2}>ชื่อห้องเรียน</th>
                <th className="px-2 py-2 font-semibold text-slate-800 bg-slate-100 border-x-2 border-slate-200" colSpan={3}>จำนวนนักเรียน</th>
                <th className="px-2 py-2 font-semibold text-rose-800 bg-rose-100 border-x-2 border-rose-200" colSpan={3}>ป่วย</th>
                <th className="px-2 py-2 font-semibold text-amber-800 bg-amber-100 border-x-2 border-amber-200" colSpan={3}>ลา</th>
                <th className="px-2 py-2 font-semibold text-red-800 bg-red-100 border-x-2 border-red-200" colSpan={3}>ขาด</th>
                <th className="px-2 py-2 font-semibold text-emerald-800 bg-emerald-100 border-x-2 border-emerald-200" colSpan={3}>มาเรียน (คำนวณ)</th>
                <th className="px-2 py-2 font-semibold" rowSpan={2}>หมายเหตุ</th>
                <th className="px-2 py-2 text-right font-semibold" rowSpan={2}>จัดการ</th>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 text-center text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-semibold text-sky-700 bg-slate-50 border-l-2 border-slate-200">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-700 bg-slate-50">หญิง</th>
                <th className="px-2 py-2 font-semibold text-slate-800 bg-slate-50 border-r-2 border-slate-200">รวม</th>
                <th className="px-2 py-2 font-semibold text-sky-700 bg-rose-50 border-l-2 border-rose-200">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-700 bg-rose-50">หญิง</th>
                <th className="px-2 py-2 font-semibold text-rose-800 bg-rose-50 border-r-2 border-rose-200">รวม</th>
                <th className="px-2 py-2 font-semibold text-sky-700 bg-amber-50 border-l-2 border-amber-200">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-700 bg-amber-50">หญิง</th>
                <th className="px-2 py-2 font-semibold text-amber-800 bg-amber-50 border-r-2 border-amber-200">รวม</th>
                <th className="px-2 py-2 font-semibold text-sky-700 bg-red-50 border-l-2 border-red-200">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-700 bg-red-50">หญิง</th>
                <th className="px-2 py-2 font-semibold text-red-800 bg-red-50 border-r-2 border-red-200">รวม</th>
                <th className="px-2 py-2 font-semibold text-sky-700 bg-emerald-50 border-l-2 border-emerald-200">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-700 bg-emerald-50">หญิง</th>
                <th className="px-2 py-2 font-semibold text-emerald-800 bg-emerald-50 border-r-2 border-emerald-200">รวม</th>
              </tr>
            </thead>
            <tbody>
              {groupedClassrooms.map((group) => (
                <ClassroomGroupRows
                  key={group.level}
                  group={group}
                  getRowState={getRowState}
                  recordByClass={recordByClass}
                  totalByClass={totalByClass}
                  updateField={updateField}
                  handleFieldFocus={handleFieldFocus}
                  handleFieldBlur={handleFieldBlur}
                  saveMutation={saveMutation}
                  resetRow={resetRow}
                  slotKey={slotKey}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              ))}
              {classrooms.length === 0 && (
                <tr>
                  <td colSpan={19} className="px-4 py-12 text-center text-slate-400">
                    กำลังโหลดรายชื่อห้องเรียน...
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-emerald-200 bg-emerald-50/60 text-center font-semibold text-slate-800">
                <td className="px-1 py-3 sticky left-0 z-[5] bg-emerald-50/60"></td>
                <td className="px-3 py-3 text-left min-w-[200px]">รวมทุกห้อง</td>
                <td className="px-2 py-3 text-sky-800 bg-slate-100 border-l-2 border-slate-300">{totalSummary.male}</td>
                <td className="px-2 py-3 text-pink-800 bg-slate-100">{totalSummary.female}</td>
                <td className="px-2 py-3 font-bold text-slate-900 bg-slate-100 border-r-2 border-slate-300">{totalSummary.total}</td>
                <td className="px-2 py-3 text-sky-800 bg-rose-100 border-l-2 border-rose-300">{totalSummary.sM}</td>
                <td className="px-2 py-3 text-pink-800 bg-rose-100">{totalSummary.sF}</td>
                <td className="px-2 py-3 font-bold text-rose-900 bg-rose-100 border-r-2 border-rose-300">{totalSummary.sick}</td>
                <td className="px-2 py-3 text-sky-800 bg-amber-100 border-l-2 border-amber-300">{totalSummary.lM}</td>
                <td className="px-2 py-3 text-pink-800 bg-amber-100">{totalSummary.lF}</td>
                <td className="px-2 py-3 font-bold text-amber-900 bg-amber-100 border-r-2 border-amber-300">{totalSummary.leave}</td>
                <td className="px-2 py-3 text-sky-800 bg-red-100 border-l-2 border-red-300">{totalSummary.aM}</td>
                <td className="px-2 py-3 text-pink-800 bg-red-100">{totalSummary.aF}</td>
                <td className="px-2 py-3 font-bold text-red-900 bg-red-100 border-r-2 border-red-300">{totalSummary.absent}</td>
                <td className="px-2 py-3 text-sky-800 bg-emerald-100 border-l-2 border-emerald-300">{totalSummary.pM}</td>
                <td className="px-2 py-3 text-pink-800 bg-emerald-100">{totalSummary.pF}</td>
                <td className="px-2 py-3 text-emerald-900 font-bold bg-emerald-100 border-r-2 border-emerald-300">{totalSummary.present}</td>
                <td colSpan={2} className="px-2 py-3 text-right text-xs text-slate-500">
                  อัตราการมาเรียนรวม:{' '}
                  {totalSummary.total > 0
                    ? ((totalSummary.present / totalSummary.total) * 100).toFixed(1) + '%'
                    : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

interface ClassroomGroupRowsProps {
  group: { level: string; classrooms: Classroom[] }
  getRowState: (classroomId: string) => RowState
  recordByClass: Map<string, AttendanceRecord>
  totalByClass: (id: string) => {
    male: number; female: number; total: number;
    sM: number; sF: number; sick: number;
    lM: number; lF: number; leave: number;
    aM: number; aF: number; absent: number;
    presentMale: number; presentFemale: number; present: number;
    overLimitMale: boolean; overLimitFemale: boolean;
  }
  updateField: (classroomId: string, field: keyof RowState, value: string) => void
  handleFieldFocus: (classroomId: string) => void
  handleFieldBlur: (classroomId: string) => void
  saveMutation: { isPending: boolean; mutateAsync: (id: string) => Promise<void>; variables?: string }
  resetRow: (classroomId: string) => void
  slotKey: (cid: string) => EditingSlot | undefined
  currentUserId: string | null
  isAdmin?: boolean
}

function ClassroomGroupRows({
  group,
  getRowState,
  recordByClass,
  totalByClass,
  updateField,
  handleFieldFocus,
  handleFieldBlur,
  saveMutation,
  resetRow,
  slotKey: getSlot,
  currentUserId,
  isAdmin,
}: ClassroomGroupRowsProps) {
  const groupTotals = useMemo(() => {
    let male = 0, female = 0
    let sM = 0, sF = 0, lM = 0, lF = 0, aM = 0, aF = 0
    let pM = 0, pF = 0
    for (const c of group.classrooms) {
      const calc = totalByClass(c.id)
      male += calc.male
      female += calc.female
      sM += calc.sM; sF += calc.sF
      lM += calc.lM; lF += calc.lF
      aM += calc.aM; aF += calc.aF
      pM += calc.presentMale; pF += calc.presentFemale
    }
    return {
      male, female, total: male + female,
      sM, sF, sick: sM + sF,
      lM, lF, leave: lM + lF,
      aM, aF, absent: aM + aF,
      pM, pF, present: pM + pF,
    }
  }, [group.classrooms, totalByClass])

  const sumSubBoxClass = (borderColor: string, textColor: string, bg = 'bg-white/60') =>
    `flex h-8 items-center justify-center rounded-md border ${borderColor} ${bg} text-xs font-bold ${textColor}`

  return (
    <>
      <tr className="bg-slate-50/80">
        <td colSpan={19} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          ระดับ{group.level}
        </td>
      </tr>
      {group.classrooms.map((c) => {
        const r = getRowState(c.id)
        const calc = totalByClass(c.id)
        const existing = recordByClass.get(c.id)
        const slot = getSlot(c.id)
        const lockedByOther = slot && slot.userId !== currentUserId
        const isSaving = saveMutation.isPending && saveMutation.variables === c.id
        const overLimit = calc.overLimitMale || calc.overLimitFemale

        const serverField = (key: keyof RowState) => {
          if (!existing) return ''
          switch (key) {
            case 'totalMale': return String(existing.totalMale)
            case 'totalFemale': return String(existing.totalFemale)
            case 'sickMale': return String(existing.sickMale)
            case 'sickFemale': return String(existing.sickFemale)
            case 'leaveMale': return String(existing.leaveMale)
            case 'leaveFemale': return String(existing.leaveFemale)
            case 'absentMale': return String(existing.absentMale)
            case 'absentFemale': return String(existing.absentFemale)
            case 'note': return existing.note ?? ''
            default: return ''
          }
        }

        const hasChange =
          (r.totalMale !== '' && r.totalMale !== serverField('totalMale')) ||
          (r.totalFemale !== '' && r.totalFemale !== serverField('totalFemale')) ||
          (r.sickMale !== '' && r.sickMale !== serverField('sickMale')) ||
          (r.sickFemale !== '' && r.sickFemale !== serverField('sickFemale')) ||
          (r.leaveMale !== '' && r.leaveMale !== serverField('leaveMale')) ||
          (r.leaveFemale !== '' && r.leaveFemale !== serverField('leaveFemale')) ||
          (r.absentMale !== '' && r.absentMale !== serverField('absentMale')) ||
          (r.absentFemale !== '' && r.absentFemale !== serverField('absentFemale')) ||
          r.note !== (existing?.note ?? '')

        const sumBoxClass = (borderColor: string, textColor: string, bg = 'bg-slate-50') =>
          `flex h-9 items-center justify-center rounded-md border ${borderColor} ${bg} text-sm font-bold ${textColor}`

        return (
          <tr
            key={c.id}
            data-row-id={c.id}
            className="border-b border-slate-100 transition-colors hover:bg-emerald-50/30"
          >
            {/* Save + code — sticky */}
            <td className="px-1 py-2 text-center sticky left-0 z-[5] bg-white">
              <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost"
                onClick={async () => {
                  if (overLimit) {
                    toast.error('จำนวนป่วย+ลา+ขาด มากกว่าจำนวนนักเรียน (แยกตามเพศ)')
                    return
                  }
                  if (!r.totalMale && !r.totalFemale) {
                    toast.error('กรุณากรอกจำนวนนักเรียนชายหรือหญิงอย่างน้อย 1 คน')
                    return
                  }
                  await saveMutation.mutateAsync(c.id)
                }}
                disabled={isSaving || overLimit || !hasChange}
                className="h-8 w-8 bg-emerald-600 p-0 hover:bg-emerald-700 shrink-0"
                title="บันทึก">
                {isSaving ? <RotateCcw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              </Button>
                <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-emerald-100 px-1.5 text-xs font-bold text-emerald-700">
                  {c.code}
                </div>
              </div>
            </td>

            {/* Classroom name — not sticky */}
            <td className="px-2 py-3 text-left min-w-[200px]">
              <div className="text-sm font-medium text-slate-800">{c.name}</div>
              {existing?.recordedBy && (
                <div className="text-[11px] text-slate-400">
                  บันทึกล่าสุดโดย {existing.recordedBy}
                </div>
              )}
            </td>

            {/* จำนวนนักเรียน */}
            <td className="px-1 py-2 text-center bg-slate-50/50 border-l-2 border-slate-200">
              <NumberInput value={r.totalMale} onValueChange={(v) => updateField(c.id, 'totalMale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!isAdmin || !!lockedByOther} hideButtons={true} colorClassName="text-sky-800" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center bg-slate-50/50">
              <NumberInput value={r.totalFemale} onValueChange={(v) => updateField(c.id, 'totalFemale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!isAdmin || !!lockedByOther} hideButtons={true} colorClassName="text-pink-800" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center bg-slate-50/50 border-r-2 border-slate-200">
              <div className={sumBoxClass('border-slate-300', 'text-slate-800', 'bg-slate-100')}>{calc.total}</div>
            </td>

            {/* ป่วย */}
            <td className="px-1 py-2 text-center bg-rose-50/50 border-l-2 border-rose-200">
              <NumberInput value={r.sickMale} onValueChange={(v) => updateField(c.id, 'sickMale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-sky-800" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center bg-rose-50/50">
              <NumberInput value={r.sickFemale} onValueChange={(v) => updateField(c.id, 'sickFemale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-pink-800" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center bg-rose-50/50 border-r-2 border-rose-200">
              <div className={sumBoxClass('border-rose-300', 'text-rose-800', 'bg-rose-100')}>{calc.sick}</div>
            </td>

            {/* ลา */}
            <td className="px-1 py-2 text-center bg-amber-50/50 border-l-2 border-amber-200">
              <NumberInput value={r.leaveMale} onValueChange={(v) => updateField(c.id, 'leaveMale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-sky-800" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center bg-amber-50/50">
              <NumberInput value={r.leaveFemale} onValueChange={(v) => updateField(c.id, 'leaveFemale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-pink-800" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center bg-amber-50/50 border-r-2 border-amber-200">
              <div className={sumBoxClass('border-amber-300', 'text-amber-800', 'bg-amber-100')}>{calc.leave}</div>
            </td>

            {/* ขาด */}
            <td className="px-1 py-2 text-center bg-red-50/50 border-l-2 border-red-200">
              <NumberInput value={r.absentMale} onValueChange={(v) => updateField(c.id, 'absentMale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-sky-800" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center bg-red-50/50">
              <NumberInput value={r.absentFemale} onValueChange={(v) => updateField(c.id, 'absentFemale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-pink-800" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center bg-red-50/50 border-r-2 border-red-200">
              <div className={sumBoxClass('border-red-300', 'text-red-800', 'bg-red-100')}>{calc.absent}</div>
            </td>

            {/* มา (คำนวณ) */}
            <td className="px-1 py-2 text-center bg-emerald-50/50 border-l-2 border-emerald-200">
              <div className={sumBoxClass('border-sky-300', 'text-sky-800', 'bg-sky-100')}>{calc.presentMale}</div>
            </td>
            <td className="px-1 py-2 text-center bg-emerald-50/50">
              <div className={sumBoxClass('border-pink-300', 'text-pink-800', 'bg-pink-100')}>{calc.presentFemale}</div>
            </td>
            <td className="px-1 py-2 text-center bg-emerald-50/50 border-r-2 border-emerald-200">
              <div className={`flex h-9 items-center justify-center rounded-md border-2 text-sm font-bold ${
                overLimit
                  ? 'border-red-400 bg-red-100 text-red-800'
                  : 'border-emerald-400 bg-emerald-200 text-emerald-900 shadow-sm'
              }`}>{calc.present}</div>
            </td>

            <td className="px-1 py-2 text-center">
              <Input type="text" value={r.note}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                onChange={(e) => updateField(c.id, 'note', e.target.value)}
                placeholder="—" disabled={!!lockedByOther}
                className="h-9 w-24 text-center text-xs" />
            </td>

            <td className="px-1 py-2 text-right">
              <div className="flex items-center justify-end gap-1">
                {lockedByOther && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                    <Lock className="mr-1 h-3 w-3" />
                    {slot?.userName?.slice(0, 12)}
                  </Badge>
                )}
                {overLimit && !lockedByOther && (
                  <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    เกิน
                  </span>
                )}
                {existing && !hasChange && !lockedByOther && (
                  <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    บันทึกแล้ว
                  </span>
                )}
                {!lockedByOther && existing && (
                  <Button size="sm" variant="ghost" onClick={() => resetRow(c.id)}
                    className="h-8 w-8 p-0 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    title="ล้างข้อมูลห้องนี้">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </td>
          </tr>
        )
      })}
      {/* Subtotal row for this level */}
      <tr className="border-t-2 border-slate-300 bg-gradient-to-r from-slate-50 to-slate-100/80 text-center font-semibold text-slate-700">
        <td className="px-1 py-2 sticky left-0 z-[5] bg-gradient-to-r from-slate-50 to-slate-100/80">
          <div className="text-xs font-semibold text-slate-500">รวม</div>
        </td>
        <td className="px-3 py-2 text-left text-xs">รวมระดับ{group.level}</td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-sky-200', 'text-sky-700', 'bg-sky-50/60')}>{groupTotals.male}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-pink-200', 'text-pink-700', 'bg-pink-50/60')}>{groupTotals.female}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-slate-200', 'text-slate-700')}>{groupTotals.total}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-sky-200', 'text-sky-700', 'bg-sky-50/60')}>{groupTotals.sM}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-pink-200', 'text-pink-700', 'bg-pink-50/60')}>{groupTotals.sF}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-rose-200', 'text-rose-700', 'bg-rose-50/60')}>{groupTotals.sick}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-sky-200', 'text-sky-700', 'bg-sky-50/60')}>{groupTotals.lM}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-pink-200', 'text-pink-700', 'bg-pink-50/60')}>{groupTotals.lF}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-amber-200', 'text-amber-700', 'bg-amber-50/60')}>{groupTotals.leave}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-sky-200', 'text-sky-700', 'bg-sky-50/60')}>{groupTotals.aM}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-pink-200', 'text-pink-700', 'bg-pink-50/60')}>{groupTotals.aF}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-red-200', 'text-red-700', 'bg-red-50/60')}>{groupTotals.absent}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-sky-200', 'text-sky-700', 'bg-sky-50/60')}>{groupTotals.pM}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-pink-200', 'text-pink-700', 'bg-pink-50/60')}>{groupTotals.pF}</div>
        </td>
        <td className="px-1 py-2">
          <div className={sumSubBoxClass('border-emerald-200', 'text-emerald-700', 'bg-emerald-50/60')}>{groupTotals.present}</div>
        </td>
        <td colSpan={2} className="px-2 py-2 text-right text-[11px] text-slate-400">
          {groupTotals.total > 0 ? ((groupTotals.present / groupTotals.total) * 100).toFixed(1) + '%' : '—'}
        </td>
      </tr>
    </>
  )
}
