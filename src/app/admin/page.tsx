'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Shield, ArrowLeft, Save, Trash2, Loader2, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ROLES = [
  { value: 'admin', label: 'ผู้ดูแลระบบ', color: 'bg-red-100 text-red-700' },
  { value: 'director', label: 'ผู้อำนวยการ', color: 'bg-amber-100 text-amber-700' },
  { value: 'teacher', label: 'คุณครู', color: 'bg-emerald-100 text-emerald-700' },
]

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string | null; role: string }>>([])
  const [loading, setLoading] = useState(true)
  
  // Settings state
  const [academicYear, setAcademicYear] = useState('')
  const [term1Start, setTerm1Start] = useState('')
  const [term1End, setTerm1End] = useState('')
  const [term2Start, setTerm2Start] = useState('')
  const [term2End, setTerm2End] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'loading') return
    if (!session?.user?.isAdmin) { router.push('/'); return }
    fetchUsers()
    fetchSettings()
  }, [status, session])

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('โหลดไม่สำเร็จ')
      const data = await res.json()
      setUsers(data.users || [])
    } catch { toast.error('โหลดรายชื่อผู้ใช้ไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings/semester')
      if (res.ok) {
        const data = await res.json()
        setAcademicYear(data.academicYear?.toString() || '')
        setTerm1Start(data.term1?.start || '')
        setTerm1End(data.term1?.end || '')
        setTerm2Start(data.term2?.start || '')
        setTerm2End(data.term2?.end || '')
      }
    } catch {
      console.error('Failed to fetch settings')
    }
  }

  const updateRole = async (email: string, role: string, name: string | null) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, name }),
      })
      if (!res.ok) throw new Error()
      toast.success(`อัปเดตบทบาท ${email} เป็น ${ROLES.find(r=>r.value===role)?.label}`)
      fetchUsers()
    } catch { toast.error('อัปเดตไม่สำเร็จ') }
  }

  const removeUser = async (email: string) => {
    if (!confirm(`ลบ ${email} ออกจากระบบจัดการบทบาท?`)) return
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(`ลบ ${email} แล้ว`)
      fetchUsers()
    } catch { toast.error('ลบไม่สำเร็จ') }
  }

  const saveSettings = async () => {
    if (!academicYear) {
      toast.error('กรุณากรอกปีการศึกษา')
      return
    }
    setSavingSettings(true)
    try {
      const res = await fetch('/api/admin/settings/semester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: parseInt(academicYear, 10),
          term1: (term1Start && term1End) ? { start: term1Start, end: term1End } : null,
          term2: (term2Start && term2End) ? { start: term2Start, end: term2End } : null
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว')
    } catch { 
      toast.error('บันทึกไม่สำเร็จ') 
    } finally {
      setSavingSettings(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </Button>
          <Shield className="h-6 w-6 text-red-600" />
          <h1 className="text-xl font-bold text-slate-800">ผู้ดูแลระบบ</h1>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> จัดการผู้ใช้งาน
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" /> ตั้งค่าระบบ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base">รายชื่อผู้ใช้ทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">ยังไม่มีผู้ใช้ที่ login เข้ามา</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate">
                            {user.name || user.email}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => updateRole(user.email, e.target.value, user.name)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUser(user.email)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              <strong>คำอธิบาย:</strong> ผู้ดูแลระบบ = จัดการทุกอย่าง, ผู้อำนวยการ = ลงนามรับรองได้, คุณครู = บันทึกข้อมูลได้อย่างเดียว
              <br/>เฉพาะ <strong>ผู้ดูแลระบบ</strong> เท่านั้นที่เข้าหน้านี้ได้ — หลังจากตั้งตัวเองเป็น admin แล้ว จะกู้คืนไม่ได้ผ่านหน้านี้ (ต้องแก้ในฐานข้อมูลโดยตรง)
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ปีการศึกษาและภาคเรียน</CardTitle>
                <CardDescription>
                  กำหนดช่วงเวลาของภาคเรียน ระบบจะใช้วันที่ปัจจุบันเพื่อคำนวณภาคเรียนอัตโนมัติ 
                  หากอยู่นอกช่วงเวลาทั้งสอง ระบบจะถือว่าเป็นช่วง "ปิดเทอม"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="academicYear">ปีการศึกษา (พ.ศ.)</Label>
                  <Input 
                    id="academicYear" 
                    type="number" 
                    placeholder="เช่น 2569" 
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-slate-700">ภาคเรียนที่ 1</h3>
                    <div className="space-y-2">
                      <Label htmlFor="term1Start" className="text-xs text-slate-500">วันเปิดภาคเรียน</Label>
                      <Input 
                        id="term1Start" 
                        type="date" 
                        value={term1Start}
                        onChange={(e) => setTerm1Start(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="term1End" className="text-xs text-slate-500">วันปิดภาคเรียน</Label>
                      <Input 
                        id="term1End" 
                        type="date" 
                        value={term1End}
                        onChange={(e) => setTerm1End(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-slate-700">ภาคเรียนที่ 2</h3>
                    <div className="space-y-2">
                      <Label htmlFor="term2Start" className="text-xs text-slate-500">วันเปิดภาคเรียน</Label>
                      <Input 
                        id="term2Start" 
                        type="date" 
                        value={term2Start}
                        onChange={(e) => setTerm2Start(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="term2End" className="text-xs text-slate-500">วันปิดภาคเรียน</Label>
                      <Input 
                        id="term2End" 
                        type="date" 
                        value={term2End}
                        onChange={(e) => setTerm2End(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4" 
                  onClick={saveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  บันทึกการตั้งค่า
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
