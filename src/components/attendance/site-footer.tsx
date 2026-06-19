'use client'

import { Heart } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-emerald-100/80 bg-gradient-to-r from-emerald-50/60 to-teal-50/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 text-rose-400" />
          <span>ระบบบันทึกสถิตินักเรียนประจำวัน — โรงเรียนบ้านหนองบัวโนนเมือง</span>
        </div>
        <div className="text-[11px] text-slate-400">
          รองรับการใช้งานพร้อมกันหลายคนแบบเรียลไทม์ · คำนวณอัตโนมัติ
        </div>
      </div>
    </footer>
  )
}
