'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { FcGoogle } from 'react-icons/fc'
import { GraduationCap, Loader2, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false)
  const [devLoading, setDevLoading] = useState(false)
  const [isDevMode, setIsDevMode] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState('/')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCallbackUrl(params.get('callbackUrl') || '/')
    setError(params.get('error'))

    if (params.get('dev') === '1') {
      setIsDevMode(true)
      return
    }

    let cancelled = false
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.['dev-credentials']) {
          setIsDevMode(true)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl, prompt: 'select_account' })
    } catch {
      setLoading(false)
    }
  }

  const handleDevSignIn = async () => {
    setDevLoading(true)
    try {
      const result = await signIn('dev-credentials', {
        name: 'ครูทดสอบ (Dev)',
        email: 'dev@bnnm.local',
        redirect: false,
      })
      if (result?.ok) {
        window.location.href = callbackUrl
      } else {
        setDevLoading(false)
      }
    } catch {
      setDevLoading(false)
    }
  }

  const errorMessage = error
    ? error === 'OAuthSignin' || error === 'OAuthCallback'
      ? 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองอีกครั้ง หรือตรวจสอบการตั้งค่า Google OAuth'
      : error === 'AccessDenied'
      ? 'อีเมลนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแล'
      : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองอีกครั้ง'
    : null

  return (
    <Card className="border-emerald-100/80 shadow-xl shadow-emerald-900/5">
      <CardHeader className="gap-2 border-b border-slate-100 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 pb-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
          <GraduationCap className="h-8 w-8" />
        </div>
        <CardTitle className="text-xl text-slate-800">เข้าสู่ระบบ</CardTitle>
        <CardDescription className="text-sm text-slate-500">
          ระบบบันทึกสถิตินักเรียนประจำวัน<br />
          โรงเรียนบ้านหนองบัวโนนเมือง
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <Button
          onClick={handleSignIn}
          disabled={loading}
          variant="outline"
          className="h-12 w-full gap-3 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          ) : (
            <FcGoogle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
          </span>
        </Button>

        {isDevMode && (
          <div className="space-y-2">
            <div className="relative flex items-center gap-2 text-center">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                สำหรับทดสอบ (Dev Mode)
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <Button
              onClick={handleDevSignIn}
              disabled={devLoading}
              variant="secondary"
              className="h-10 w-full gap-2 bg-amber-100 text-amber-800 hover:bg-amber-200"
            >
              {devLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              เข้าสู่ระบบทดสอบ (ไม่ต้องใช้ Google)
            </Button>
            <p className="text-center text-[10px] text-slate-400">
              ปุ่มนี้จะไม่แสดงในโปรดักชันเมื่อตั้งค่า GOOGLE_CLIENT_ID จริงแล้ว
            </p>
          </div>
        )}

        <div className="space-y-2 text-center text-xs text-slate-500">
          <p>
            ครูทุกท่านต้องล็อกอินด้วยบัญชี Google เพื่อบันทึกข้อมูล
          </p>
          <p className="text-[11px] text-slate-400">
            ระบบจะจดจำชื่อและอีเมลของท่านเพื่อระบุผู้บันทึกข้อมูลแต่ละรายการ
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
