'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'

export interface OnlineUser {
  id: string
  name: string
  joinedAt: number
}

export interface EditingSlot {
  userId: string
  userName: string
  date: string
  classroomId: string
  startedAt: number
}

export interface AttendanceUpdateEvent {
  date: string
  classroomId: string
  by: string
  at: number
}

interface SocketSyncOptions {
  userName: string
  onAttendanceUpdated?: (e: AttendanceUpdateEvent) => void
  onEditingUpdate?: (slots: EditingSlot[]) => void
  onUsersUpdate?: (users: OnlineUser[]) => void
  onEditingRejected?: (slot: EditingSlot) => void
}

// ตรวจว่า environment นี้รองรับ Socket.io หรือไม่
// - ใน sandbox ของ Z.ai: ใช้ socket.io ผ่าน Caddy gateway (XTransformPort=3003)
// - ใน Vercel/production: ปิด socket.io ใช้ polling fallback แทน (Vercel serverless ไม่รองรับ WebSocket ที่ persistent)
const SOCKET_ENABLED =
  typeof window !== 'undefined' &&
  (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.space-z.ai') ||
    window.location.search.includes('enableSocket=1')
  )

export function useSocketSync(opts: SocketSyncOptions) {
  const { userName } = opts
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(SOCKET_ENABLED ? false : true)
  const [selfSocketId, setSelfSocketId] = useState<string | null>(
    SOCKET_ENABLED ? null : `polling-${Date.now()}`
  )
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>(
    SOCKET_ENABLED
      ? []
      : [{ id: `polling-${Date.now()}`, name: userName || 'คุณครู', joinedAt: Date.now() }]
  )
  const [editingSlots, setEditingSlots] = useState<EditingSlot[]>([])

  const cbRefs = useRef(opts)
  useEffect(() => {
    cbRefs.current = opts
  })

  // Polling fallback — invalidate queries ทุก 10 วินาที เพื่อให้ multi-user sync ทำงานได้
  // ใช้ใน Vercel/production ที่ไม่มี Socket.io
  useEffect(() => {
    if (SOCKET_ENABLED) return // ถ้ามี socket ไม่ต้อง polling
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['trends'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
    }, 10000)
    return () => clearInterval(interval)
  }, [queryClient])

  // อัปเดตชื่อใน onlineUsers เมื่อ userName เปลี่ยน (polling mode)
  useEffect(() => {
    if (SOCKET_ENABLED) return
    setOnlineUsers((prev) =>
      prev.map((u) => (u.id === selfSocketId ? { ...u, name: userName || 'คุณครู' } : u))
    )
  }, [userName, selfSocketId])

  useEffect(() => {
    if (!SOCKET_ENABLED) return

    const socket = io('/?XTransformPort=3003', {
      transports: ['polling', 'websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setSelfSocketId(socket.id ?? null)
      setIsConnected(true)
      if (userName.trim()) {
        socket.emit('user:join', { name: userName.trim() })
      }
    })

    socket.on('connect_error', () => {
      setIsConnected(false)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setSelfSocketId(null)
    })

    socket.on('users:list', (data: { users: OnlineUser[] }) => {
      setOnlineUsers(data.users)
      cbRefs.current.onUsersUpdate?.(data.users)
    })

    socket.on('users:joined', (data: { user: OnlineUser }) => {
      setOnlineUsers((prev) => (prev.find((u) => u.id === data.user.id) ? prev : [...prev, data.user]))
    })

    socket.on('users:left', (data: { user: OnlineUser }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== data.user.id))
    })

    socket.on('editing:list', (data: { slots: EditingSlot[] }) => {
      setEditingSlots(data.slots)
      cbRefs.current.onEditingUpdate?.(data.slots)
    })

    socket.on('editing:started', (data: { slot: EditingSlot }) => {
      setEditingSlots((prev) => {
        const filtered = prev.filter((s) => !(s.date === data.slot.date && s.classroomId === data.slot.classroomId))
        return [...filtered, data.slot]
      })
    })

    socket.on('editing:stopped', (data: { date: string; classroomId: string }) => {
      setEditingSlots((prev) => prev.filter((s) => !(s.date === data.date && s.classroomId === data.classroomId)))
    })

    socket.on('editing:rejected', (data: { slot: EditingSlot }) => {
      cbRefs.current.onEditingRejected?.(data.slot)
    })

    socket.on('attendance:updated', (data: AttendanceUpdateEvent) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', data.date] })
      queryClient.invalidateQueries({ queryKey: ['summary', data.date] })
      queryClient.invalidateQueries({ queryKey: ['trends'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      cbRefs.current.onAttendanceUpdated?.(data)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!SOCKET_ENABLED) return
    if (socketRef.current && isConnected && userName.trim()) {
      socketRef.current.emit('user:join', { name: userName.trim() })
    }
  }, [userName, isConnected])

  const startEditing = useCallback((date: string, classroomId: string) => {
    socketRef.current?.emit('editing:start', { date, classroomId })
  }, [])

  const stopEditing = useCallback((date: string, classroomId: string) => {
    socketRef.current?.emit('editing:stop', { date, classroomId })
  }, [])

  const broadcastSaved = useCallback((date: string, classroomId: string) => {
    socketRef.current?.emit('attendance:saved', { date, classroomId })
  }, [])

  const broadcastDeleted = useCallback((date: string, classroomId: string) => {
    socketRef.current?.emit('attendance:deleted', { date, classroomId })
  }, [])

  return {
    isConnected,
    selfSocketId,
    onlineUsers,
    editingSlots,
    startEditing,
    stopEditing,
    broadcastSaved,
    broadcastDeleted,
  }
}
