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
      const e = edits[classroomId] ?? {}
      return {
        totalMale: e.totalMale ?? (r ? String(r.totalMale) : ''),
        totalFemale: e.totalFemale ?? (r ? String(r.totalFemale) : ''),
        sickMale: e.sickMale ?? (r ? String(r.sickMale) : ''),
        sickFemale: e.sickFemale ?? (r ? String(r.sickFemale) : ''),
        leaveMale: e.leaveMale ?? (r ? String(r.leaveMale) : ''),
        leaveFemale: e.leaveFemale ?? (r ? String(r.leaveFemale) : ''),
        absentMale: e.absentMale ?? (r ? String(r.absentMale) : ''),
        absentFemale: e.absentFemale ?? (r ? String(r.absentFemale) : ''),
        note: e.note ?? (r?.note ?? ''),
      }
    },
    [recordByClass, edits]
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-end">
            <div className="space-y-1">
              <Label htmlFor="teacher" className="text-xs text-slate-600">
                <UserCog className="mr-1 inline h-3.5 w-3.5" />
                คุณครูผู้บันทึก (จาก Google)
              </Label>
              <Input
                id="teacher"
                value={teacherName}
                readOnly
                placeholder="กรุณาล็อกอิน"
                className="h-9 w-full cursor-not-allowed bg-slate-100 text-slate-600 lg:w-44"
                title="ชื่อนี้ใช้จากบัญชี Google ของท่าน ไม่สามารถแก้ไขได้"
              />
            </div>
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
        {/* Mobile legend */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs sm:hidden">
          <span className="text-slate-500">สี:</span>
          <Badge className="bg-sky-100 text-sky-700">ชาย</Badge>
          <Badge className="bg-pink-100 text-pink-700">หญิง</Badge>
          <Badge className="bg-emerald-100 text-emerald-700">มา</Badge>
          <Badge className="bg-rose-100 text-rose-700">ป่วย</Badge>
          <Badge className="bg-amber-100 text-amber-700">ลา</Badge>
          <Badge className="bg-red-100 text-red-700">ขาด</Badge>
        </div>

        {/* Form table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-center text-xs uppercase tracking-wide text-slate-600">
                <th className="px-3 py-3 text-left font-semibold" rowSpan={2}>ห้องเรียน</th>
                <th className="px-2 py-2 font-semibold text-slate-700" colSpan={3}>จำนวนนักเรียน</th>
                <th className="px-2 py-2 font-semibold text-rose-600" colSpan={3}>ป่วย</th>
                <th className="px-2 py-2 font-semibold text-amber-600" colSpan={3}>ลา</th>
                <th className="px-2 py-2 font-semibold text-red-600" colSpan={3}>ขาด</th>
                <th className="px-2 py-2 font-semibold text-emerald-700" colSpan={3}>มาเรียน (คำนวณ)</th>
                <th className="px-2 py-2 font-semibold" rowSpan={2}>หมายเหตุ</th>
                <th className="px-2 py-2 text-right font-semibold" rowSpan={2}>จัดการ</th>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 text-center text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-semibold text-sky-600">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-600">หญิง</th>
                <th className="px-2 py-2 font-semibold text-slate-700">รวม</th>
                <th className="px-2 py-2 font-semibold text-sky-600">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-600">หญิง</th>
                <th className="px-2 py-2 font-semibold text-rose-600">รวม</th>
                <th className="px-2 py-2 font-semibold text-sky-600">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-600">หญิง</th>
                <th className="px-2 py-2 font-semibold text-amber-600">รวม</th>
                <th className="px-2 py-2 font-semibold text-sky-600">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-600">หญิง</th>
                <th className="px-2 py-2 font-semibold text-red-600">รวม</th>
                <th className="px-2 py-2 font-semibold text-sky-600">ชาย</th>
                <th className="px-2 py-2 font-semibold text-pink-600">หญิง</th>
                <th className="px-2 py-2 font-semibold text-emerald-700">รวม</th>
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
                <td className="px-3 py-3 text-left">รวมทุกห้อง</td>
                <td className="px-2 py-3 text-sky-700">{totalSummary.male}</td>
                <td className="px-2 py-3 text-pink-700">{totalSummary.female}</td>
                <td className="px-2 py-3">{totalSummary.total}</td>
                <td className="px-2 py-3 text-sky-700">{totalSummary.sM}</td>
                <td className="px-2 py-3 text-pink-700">{totalSummary.sF}</td>
                <td className="px-2 py-3 text-rose-700">{totalSummary.sick}</td>
                <td className="px-2 py-3 text-sky-700">{totalSummary.lM}</td>
                <td className="px-2 py-3 text-pink-700">{totalSummary.lF}</td>
                <td className="px-2 py-3 text-amber-700">{totalSummary.leave}</td>
                <td className="px-2 py-3 text-sky-700">{totalSummary.aM}</td>
                <td className="px-2 py-3 text-pink-700">{totalSummary.aF}</td>
                <td className="px-2 py-3 text-red-700">{totalSummary.absent}</td>
                <td className="px-2 py-3 text-sky-700">{totalSummary.pM}</td>
                <td className="px-2 py-3 text-pink-700">{totalSummary.pF}</td>
                <td className="px-2 py-3 text-emerald-700">{totalSummary.present}</td>
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
}: ClassroomGroupRowsProps) {
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
            <td className="px-3 py-3 text-left">
              <div className="flex items-center gap-2">
                <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-emerald-100 px-2 text-sm font-bold text-emerald-700">
                  {c.code}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-medium text-slate-800">{c.name}</div>
                  {existing?.recordedBy && (
                    <div className="text-[11px] text-slate-400">
                      บันทึกล่าสุดโดย {existing.recordedBy}
                    </div>
                  )}
                </div>
              </div>
            </td>

            {/* จำนวนนักเรียน */}
            <td className="px-1 py-2 text-center">
              <NumberInput value={r.totalMale} onValueChange={(v) => updateField(c.id, 'totalMale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-sky-700" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center">
              <NumberInput value={r.totalFemale} onValueChange={(v) => updateField(c.id, 'totalFemale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-pink-700" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center">
              <div className={sumBoxClass('border-slate-200', 'text-slate-700')}>{calc.total}</div>
            </td>

            {/* ป่วย */}
            <td className="px-1 py-2 text-center">
              <NumberInput value={r.sickMale} onValueChange={(v) => updateField(c.id, 'sickMale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-sky-700" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center">
              <NumberInput value={r.sickFemale} onValueChange={(v) => updateField(c.id, 'sickFemale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-pink-700" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center">
              <div className={sumBoxClass('border-rose-200', 'text-rose-700', 'bg-rose-50')}>{calc.sick}</div>
            </td>

            {/* ลา */}
            <td className="px-1 py-2 text-center">
              <NumberInput value={r.leaveMale} onValueChange={(v) => updateField(c.id, 'leaveMale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-sky-700" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center">
              <NumberInput value={r.leaveFemale} onValueChange={(v) => updateField(c.id, 'leaveFemale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-pink-700" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center">
              <div className={sumBoxClass('border-amber-200', 'text-amber-700', 'bg-amber-50')}>{calc.leave}</div>
            </td>

            {/* ขาด */}
            <td className="px-1 py-2 text-center">
              <NumberInput value={r.absentMale} onValueChange={(v) => updateField(c.id, 'absentMale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-sky-700" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center">
              <NumberInput value={r.absentFemale} onValueChange={(v) => updateField(c.id, 'absentFemale', v)}
                onFocus={() => handleFieldFocus(c.id)} onBlur={() => handleFieldBlur(c.id)}
                disabled={!!lockedByOther} colorClassName="text-pink-700" inputWidth={42} />
            </td>
            <td className="px-1 py-2 text-center">
              <div className={sumBoxClass('border-red-200', 'text-red-700', 'bg-red-50')}>{calc.absent}</div>
            </td>

            {/* มา (คำนวณ) */}
            <td className="px-1 py-2 text-center">
              <div className={sumBoxClass('border-sky-200', 'text-sky-700', 'bg-sky-50')}>{calc.presentMale}</div>
            </td>
            <td className="px-1 py-2 text-center">
              <div className={sumBoxClass('border-pink-200', 'text-pink-700', 'bg-pink-50')}>{calc.presentFemale}</div>
            </td>
            <td className="px-1 py-2 text-center">
              <div className={`flex h-9 items-center justify-center rounded-md border text-sm font-bold ${
                overLimit
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
                {!lockedByOther && (
                  <>
                    <Button size="sm"
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
                      className="h-8 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
                      {isSaving ? (
                        <RotateCcw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      บันทึก
                    </Button>
                    {existing && (
                      <Button size="sm" variant="ghost" onClick={() => resetRow(c.id)}
                        className="h-8 px-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="ล้างข้อมูลห้องนี้">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}
