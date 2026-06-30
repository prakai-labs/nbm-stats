'use client'

import { GraduationCap, Users, Wifi, WifiOff, Shield } from 'lucide-react'
import { formatThaiDate } from './utils'
import { UserMenu } from '@/components/auth/user-menu'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface SiteHeaderProps {
  isConnected: boolean
  onlineCount: number
  todayStr: string
}

export function SiteHeader({ isConnected, onlineCount, todayStr }: SiteHeaderProps) {
  const { data: session } = useSession()
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-700/80">
              ระบบบันทึกสถิติประจำวัน
            </div>
            <h1 className="text-base font-bold text-slate-800 sm:text-lg">
              โรงเรียนบ้านหนองบัวโนนเมือง
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right md:block">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              วันนี้
            </div>
            <div className="text-sm font-semibold text-slate-700">
              {formatThaiDate(todayStr)}
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
            }`}
            title={`${onlineCount} คนออนไลน์`}
          >
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${
                isConnected ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'
              }`}
            >
              <Users className="mr-1 h-3 w-3" />
              {onlineCount}
            </span>
          </div>
          <UserMenu />
          {session?.user?.isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
