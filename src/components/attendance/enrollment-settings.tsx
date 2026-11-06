'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { todayBangkok } from './utils'

type Room = { id: string; code: string; name: string; defaultMale: number; defaultFemale: number; countKnown: boolean }

function EnrollmentEditor({ room, date, refresh }: { room: Room; date: string; refresh: () => void }) {
  const [male, setMale] = useState(room.countKnown ? String(room.defaultMale) : '')
  const [female, setFemale] = useState(room.countKnown ? String(room.defaultFemale) : '')
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!/^\d+$/.test(male) || !/^\d+$/.test(female)) { toast.error('กรุณากรอกจำนวนชายและหญิงเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป'); return }
    setSaving(true)
    try {
      const response = await fetch('/api/admin/classroom-counts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classroomId: room.id, effectiveDate: date, male: Number(male), female: Number(female) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'บันทึกไม่สำเร็จ')
      toast.success(`บันทึกจำนวน ${room.code} ตั้งแต่วันที่เลือกแล้ว`)
      refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }
  return <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
    <div className="space-y-1"><Label htmlFor="enrollment-male">ชาย</Label><Input id="enrollment-male" type="number" min="0" step="1" value={male} onChange={e => setMale(e.target.value)} /></div>
    <div className="space-y-1"><Label htmlFor="enrollment-female">หญิง</Label><Input id="enrollment-female" type="number" min="0" step="1" value={female} onChange={e => setFemale(e.target.value)} /></div>
    <Button onClick={save} disabled={saving || !date}>{saving ? 'กำลังบันทึก…' : 'บันทึกจำนวนชั้นนี้'}</Button>
    {!room.countKnown && <p className="text-sm text-amber-800 sm:col-span-3">ไม่มีจำนวนอ้างอิงสำหรับวันที่เลือก กรุณากรอกจากข้อมูลจริง</p>}
  </div>
}

export function EnrollmentSettings() {
  const today = todayBangkok()
  const [date, setDate] = useState(today)
  const [selected, setSelected] = useState('')
  const client = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['classrooms', date], enabled: Boolean(date),
    queryFn: async () => {
      const response = await fetch(`/api/classrooms?date=${date}`)
      if (!response.ok) throw new Error('โหลดชั้นเรียนไม่สำเร็จ')
      return response.json() as Promise<{ classrooms: Room[] }>
    },
  })
  const rooms = data?.classrooms ?? []
  const room = rooms.find(r => r.id === selected)
  return <Card>
    <CardHeader><CardTitle className="text-base">จำนวนนักเรียนแต่ละชั้น</CardTitle><CardDescription>ระบุวันที่จำนวนใหม่มีผล การบันทึกสถิติรายวันที่มีอยู่จะคงยอดเดิม</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="enrollment-date">วันที่มีผล</Label><Input id="enrollment-date" type="date" max={today} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="enrollment-class">ชั้นเรียน</Label><select id="enrollment-class" value={selected} onChange={e => setSelected(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">เลือกชั้นเรียน</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.code} - {r.name}</option>)}</select></div>
      </div>
      {isLoading && <p className="text-sm text-slate-500">กำลังโหลดชั้นเรียน…</p>}
      {isError && <p className="text-sm text-red-700">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>}
      {room && <EnrollmentEditor key={`${room.id}-${date}-${room.defaultMale}-${room.defaultFemale}`} room={room} date={date} refresh={() => { void client.invalidateQueries({ queryKey: ['classrooms'] }); void client.invalidateQueries({ queryKey: ['summary'] }) }} />}
    </CardContent>
  </Card>
}
