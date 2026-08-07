"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PwaPushSubscribe({ email }: { email?: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      checkSubscription()
    } else {
      setIsLoading(false)
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error checking subscription:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const subscribeButtonOnClick = async () => {
    setIsLoading(true)
    try {
      if (isSubscribed) {
        await unsubscribeUser()
      } else {
        await subscribeUser()
      }
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setIsLoading(false)
    }
  }

  const subscribeUser = async () => {
    const registration = await navigator.serviceWorker.ready
    
    // ขอสิทธิ์
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      throw new Error("ไม่ได้รับอนุญาตให้แสดงการแจ้งเตือน")
    }

    const applicationServerKey = urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string
    )

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    // บันทึกลงเซิร์ฟเวอร์
    const res = await fetch("/api/web-push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscription,
        email: email || null
      }),
    })

    if (!res.ok) {
      await subscription.unsubscribe()
      throw new Error("ไม่สามารถบันทึกข้อมูลการตั้งค่าได้")
    }

    setIsSubscribed(true)
    toast.success("เปิดรับการแจ้งเตือนแล้ว")
  }

  const unsubscribeUser = async () => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      // ลบจากเซิร์ฟเวอร์
      await fetch(`/api/web-push?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: "DELETE",
      })
      // ลบจากเบราว์เซอร์
      await subscription.unsubscribe()
      setIsSubscribed(false)
      toast.success("ปิดการแจ้งเตือนแล้ว")
    }
  }

  if (!isSupported) {
    return null // เบราว์เซอร์ไม่รองรับ
  }

  return (
    <Button
      variant={isSubscribed ? "outline" : "default"}
      size="sm"
      onClick={subscribeButtonOnClick}
      disabled={isLoading}
      className="w-full flex items-center gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="w-4 h-4" /> ปิดการแจ้งเตือนบนอุปกรณ์นี้
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" /> เปิดรับการแจ้งเตือนบนอุปกรณ์นี้
        </>
      )}
    </Button>
  )
}
