'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Users, CheckCircle2, Stethoscope, TrendingUp, User, UserRound, BellRing, Send } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatNumber, attendanceRate } from './utils'

interface SummaryCardsProps {
  date: string
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
  classroomCount: number
}

export function SummaryCards({
  date,
  totalMale, totalFemale, totalStudents,
  presentMale, presentFemale, present,
  sickMale, sickFemale, sick,
  leaveMale, leaveFemale, leave,
  absentMale, absentFemale, absent,
  classroomCount,
}: SummaryCardsProps) {
  const [isReminding, setIsReminding] = useState(false)
  const [isReporting, setIsReporting] = useState(false)

  const handleRemind = async () => {
    setIsReminding(true)
    try {
      const res = await fetch('/api/line-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remind' })
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('ส่งแจ้งเตือนให้คุณครูในกลุ่ม LINE แล้ว')
    } catch (err) {
      toast.error('ไม่สามารถส่งแจ้งเตือนได้')
    }
    setIsReminding(false)
  }

  const handleReport = async () => {
    setIsReporting(true)
    try {
      const res = await fetch('/api/line-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report', date })
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('ส่งรายงานภาพรวมเข้ากลุ่ม LINE แล้ว')
    } catch (err) {
      toast.error('ไม่สามารถส่งรายงานได้')
    }
    setIsReporting(false)
  }

  const absentTotal = sick + leave + absent
  const rate = attendanceRate(present, totalStudents)

  const cards = [
    {
      label: 'จำนวนนักเรียนทั้งหมด',
      value: totalStudents,
      sub: `ชาย ${totalMale} · หญิง ${totalFemale} · ${classroomCount} ห้อง`,
      icon: Users,
      gradient: 'from-slate-700 to-slate-900',
      ring: 'ring-slate-200',
      text: 'text-white',
    },
    {
      label: 'นักเรียนมาเรียน',
      value: present,
      sub: `ชาย ${presentMale} · หญิง ${presentFemale} · ${rate.toFixed(1)}%`,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-200',
      text: 'text-white',
    },
    {
      label: 'ป่วย / ลา / ขาด',
      value: absentTotal,
      sub: `ป่วย ${sick} · ลา ${leave} · ขาด ${absent}`,
      icon: Stethoscope,
      gradient: 'from-rose-500 to-red-600',
      ring: 'ring-rose-200',
      text: 'text-white',
    },
    {
      label: 'อัตราการมาเรียน',
      value: `${rate.toFixed(1)}%`,
      sub: rate >= 95 ? 'อยู่ในเกณฑ์ดีมาก' : rate >= 90 ? 'อยู่ในเกณฑ์ดี' : 'ควรปรับปรุง',
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-200',
      text: 'text-white',
      isString: true,
    },
  ]

  // Detailed breakdown by gender for each status
  const breakdowns = [
    {
      label: 'มาเรียน',
      male: presentMale, female: presentFemale, total: present,
      maleColor: 'text-sky-700', femaleColor: 'text-pink-700',
      barClass: 'bg-emerald-500',
      icon: CheckCircle2, iconColor: 'text-emerald-600',
      bgClass: 'bg-emerald-50/60 border-emerald-100',
    },
    {
      label: 'ป่วย',
      male: sickMale, female: sickFemale, total: sick,
      maleColor: 'text-sky-700', femaleColor: 'text-pink-700',
      barClass: 'bg-rose-500',
      icon: Stethoscope, iconColor: 'text-rose-600',
      bgClass: 'bg-rose-50/60 border-rose-100',
    },
    {
      label: 'ลา',
      male: leaveMale, female: leaveFemale, total: leave,
      maleColor: 'text-sky-700', femaleColor: 'text-pink-700',
      barClass: 'bg-amber-500',
      icon: TrendingUp, iconColor: 'text-amber-600',
      bgClass: 'bg-amber-50/60 border-amber-100',
    },
    {
      label: 'ขาด',
      male: absentMale, female: absentFemale, total: absent,
      maleColor: 'text-sky-700', femaleColor: 'text-pink-700',
      barClass: 'bg-red-500',
      icon: Stethoscope, iconColor: 'text-red-600',
      bgClass: 'bg-red-50/60 border-red-100',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={handleRemind} disabled={isReminding} className="h-8 gap-1.5 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100">
          <BellRing className={`h-3.5 w-3.5 ${isReminding ? 'animate-bounce' : ''}`} />
          แจ้งเตือนการบันทึกสถิติ
        </Button>
        <Button size="sm" variant="default" onClick={handleReport} disabled={isReporting} className="h-8 gap-1.5 bg-[#00B900] hover:bg-[#009900] text-white">
          <Send className={`h-3.5 w-3.5 ${isReporting ? 'animate-pulse' : ''}`} />
          รายงานสถิติประจำวัน
        </Button>
      </div>

      {/* 4 main cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card
              key={c.label}
              className={`relative overflow-hidden border-0 bg-gradient-to-br ${c.gradient} ${c.text} shadow-lg shadow-slate-900/10 ring-1 ${c.ring}`}
            >
              <div className="absolute -right-6 -top-6 opacity-20">
                <Icon className="h-20 w-20" />
              </div>
              <div className="relative p-3 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-90">
                  <Icon className="h-4 w-4" />
                  {c.label}
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
                  {c.isString ? c.value : formatNumber(c.value as number)}
                </div>
                <div className="mt-1 text-xs opacity-90">{c.sub}</div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Gender breakdown by status — 4 columns showing ชาย/หญิง/รวม for มา/ป่วย/ลา/ขาด */}
      <div className="grid grid-cols-2 gap-2">
        {breakdowns.map((b) => {
          const Icon = b.icon
          const pct = totalStudents > 0 ? (b.total / totalStudents) * 100 : 0
          return (
            <Card key={b.label} className={`border ${b.bgClass} p-2.5 sm:p-3 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <Icon className={`h-3.5 w-3.5 ${b.iconColor}`} />
                  {b.label}
                </div>
                <div className="text-xs text-slate-400">{pct.toFixed(1)}%</div>
              </div>
              <div className="mt-2 text-xl font-bold text-slate-800">{formatNumber(b.total)}</div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
                <div className={`h-full ${b.barClass} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              {/* Gender split */}
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={`flex items-center gap-1 font-medium ${b.maleColor}`}>
                  <User className="h-3 w-3" />
                  {b.male}
                </span>
                <span className={`flex items-center gap-1 font-medium ${b.femaleColor}`}>
                  <UserRound className="h-3 w-3" />
                  {b.female}
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      
    </div>
  )
}
