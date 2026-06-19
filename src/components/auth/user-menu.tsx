'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { LogOut, ChevronDown, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function UserMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // ปิดเมนูเมื่อคลิกข้างนอก
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (status === 'loading') {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        <div className="h-3 w-3 animate-pulse rounded-full bg-slate-300" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const user = session.user
  const displayName = user.name || user.email || 'ผู้ใช้'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('')

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 transition-colors hover:bg-slate-50"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.image || undefined} alt={displayName} />
          <AvatarFallback className="bg-emerald-100 text-[10px] font-bold text-emerald-700">
            {initials || <UserIcon className="h-3 w-3" />}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[120px] truncate text-xs font-medium text-slate-700 sm:inline">
          {displayName}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image || undefined} alt={displayName} />
                <AvatarFallback className="bg-emerald-100 text-xs font-bold text-emerald-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{displayName}</div>
                <div className="truncate text-[11px] text-slate-500">{user.email}</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  )
}
