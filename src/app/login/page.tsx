import { GoogleSignInButton } from '@/components/auth/google-signin-button'
import { GraduationCap, CalendarDays, Users, TrendingUp } from 'lucide-react'

export const metadata = {
  title: 'เข้าสู่ระบบ | สถิตินักเรียนประจำวัน',
  description: 'เข้าสู่ระบบด้วย Google เพื่อบันทึกสถิตินักเรียนประจำวัน',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            สถิตินักเรียนประจำวัน
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            โรงเรียนบ้านหนองบัวโนนเมือง
          </p>
        </div>

        {/* Login card */}
        <GoogleSignInButton />

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/60 p-3 backdrop-blur">
            <Users className="mx-auto h-5 w-5 text-emerald-600" />
            <div className="mt-1 text-[10px] font-medium text-slate-600">หลายคนพร้อมกัน</div>
          </div>
          <div className="rounded-lg bg-white/60 p-3 backdrop-blur">
            <TrendingUp className="mx-auto h-5 w-5 text-emerald-600" />
            <div className="mt-1 text-[10px] font-medium text-slate-600">คำนวณอัตโนมัติ</div>
          </div>
          <div className="rounded-lg bg-white/60 p-3 backdrop-blur">
            <CalendarDays className="mx-auto h-5 w-5 text-emerald-600" />
            <div className="mt-1 text-[10px] font-medium text-slate-600">ปฏิทินรายเดือน</div>
          </div>
        </div>
      </div>
    </main>
  )
}
