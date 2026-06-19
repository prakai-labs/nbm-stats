'use client'

import { useEffect } from 'react'

// ลงทะเบียน service worker เมื่ออยู่ใน production เท่านั้น (หรือเมื่อต้องการทดสอบ)
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // ลงทะเบียน service worker — ใช้ในทุก environment เพื่อให้ PWA ทำงานได้
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        // ตรวจหา update
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // มี SW ใหม่ — สั่ง activate ทันที
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      } catch {
        // ไม่แสดง error ใน console — เงียบๆ ไป
      }
    }
    register()
  }, [])

  return null
}
