'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Save, RotateCcw, NotebookPen, CheckCircle2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { formatThaiDate } from './utils'
import { useSession } from 'next-auth/react'

interface DailyLogProps {
  date: string
  teacherName: string
}

export function DailyLog({ date, teacherName }: DailyLogProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [recorderName, setRecorderName] = useState(teacherName)

  const { data } = useQuery({
    queryKey: ['daily-log', date],
    queryFn: async () => {
      const res = await fetch(`/api/daily-log?date=${date}`)
      return res.json()
    },
  })

  const log = data?.log

  useEffect(() => {
    if (log) {
      setContent(log.content || '')
      setRecorderName(log.recordedBy || teacherName)
    } else {
      setContent('')
      setRecorderName(teacherName)
    }
  }, [log, teacherName])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content, recordedBy: recorderName }),
      })
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      return res.json()
    },
    onSuccess: () => {
      toast.success('บันทึกครูเวรประจำวันแล้ว')
      queryClient.invalidateQueries({ queryKey: ['daily-log', date] })
    },
    onError: () => toast.error('บันทึกไม่สำเร็จ'),
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          action: 'approve',
        }),
      })
      if (!res.ok) throw new Error('อนุมัติไม่สำเร็จ')
      return res.json()
    },
    onSuccess: () => {
      toast.success('ลงนามรับรองเรียบร้อย')
      queryClient.invalidateQueries({ queryKey: ['daily-log', date] })
    },
    onError: () => toast.error('อนุมัติไม่สำเร็จ'),
  })

  const approvedBy = log?.directorApprovedBy
  const approvedName = log?.directorApprovedName
  const approvedAt = log?.directorApprovedAt
  const currentEmail = session?.user?.email || ''
  const isApproved = !!approvedBy
  const isDirector = session?.user ? !!(session.user as any).isDirector : false

  const formatApprovedAt = useCallback(() => {
    if (!approvedAt) return ''
    const d = new Date(approvedAt)
    return d.toLocaleString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }, [approvedAt])

  return (
    <Card className="border-emerald-100/80 shadow-sm">
      <CardHeader className="gap-2 border-b border-slate-100 bg-gradient-to-br from-emerald-50/60 to-teal-50/40">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
          <NotebookPen className="h-5 w-5 text-emerald-600" />
          บันทึกครูเวรประจำวัน
        </CardTitle>
        <CardDescription className="text-slate-500">
          {formatThaiDate(date)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <Label htmlFor="log-content" className="text-xs text-slate-600">
            บันทึกประจำวัน
          </Label>
          <Textarea
            id="log-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="พิมพ์บันทึกประจำวันที่นี่..."
            className="min-h-[120px]"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="recorder-name" className="text-xs text-slate-600">
              ชื่อผู้บันทึก
            </Label>
            <Input
              id="recorder-name"
              value={recorderName}
              onChange={(e) => setRecorderName(e.target.value)}
              placeholder="ชื่อครูเวร"
              className="h-9"
            />
          </div>
          {log && !saveMutation.isPending && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              บันทึกแล้ว
            </span>
          )}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-9 gap-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {saveMutation.isPending ? (
              <RotateCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            บันทึก
          </Button>
        </div>

        {/* Director Approval Section */}
        <div className="border-t border-slate-100 pt-3">
          {isApproved ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-emerald-700">ผู้อำนวยการลงนามรับรองแล้ว</span>
              </div>
              <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                <div>ลงนามโดย: {approvedName || approvedBy}</div>
                <div>อีเมล: {approvedBy}</div>
                {approvedAt && <div>เมื่อ: {formatApprovedAt()}</div>}
              </div>
            </div>
          ) : isDirector ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-amber-700">
                    ยังไม่ได้รับการลงนามรับรอง
                  </div>
                  <div className="mt-0.5 text-[11px] text-amber-600">
                    ผู้ลงนาม: {session?.user?.name || teacherName} ({currentEmail || '—'})
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="h-7 gap-1 bg-amber-600 px-2 text-xs hover:bg-amber-700 shrink-0"
                >
                  {approveMutation.isPending ? (
                    <RotateCcw className="h-3 w-3 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3 w-3" />
                  )}
                  ลงนามรับรอง
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="text-xs text-slate-500">
                รอผู้อำนวยการลงนามรับรอง
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}