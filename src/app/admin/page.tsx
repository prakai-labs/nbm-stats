'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Shield, ArrowLeft, Save, Trash2, Loader2, Users, Settings, Bell, BarChart3 } from 'lucide-react'
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
  const [savingTerm1, setSavingTerm1] = useState(false)
  const [savingTerm2, setSavingTerm2] = useState(false)
  const [sendingRemind, setSendingRemind] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)

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
        if (data.academicYear) setAcademicYear(data.academicYear.toString())
        if (data.term1?.start) setTerm1Start(data.term1.start)
        if (data.term1?.end) setTerm1End(data.term1.end)
        if (data.term2?.start) setTerm2Start(data.term2.start)
        if (data.term2?.end) setTerm2End(data.term2.end)
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

  const saveTerm = async (termIndex: 1 | 2) => {
    if (!academicYear) {
      toast.error('กรุณากรอกปีการศึกษา')
      return
    }

    const start = termIndex === 1 ? term1Start : term2Start
    const end = termIndex === 1 ? term1End : term2End

    if (!start || !end) {
      toast.error(`กรุณากรอกวันที่ของภาคเรียนที่ ${termIndex} ให้ครบทั้งวันเปิดและวันปิด`)
      return
    }

    const setSaving = termIndex === 1 ? setSavingTerm1 : setSavingTerm2
    setSaving(true)

    try {
      const termKey = termIndex === 1 ? 'term1' : 'term2'
      const res = await fetch('/api/admin/settings/semester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: parseInt(academicYear, 10),
          [termKey]: { start, end }
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Unknown error')
      }
      toast.success(`บันทึกการตั้งค่าภาคเรียนที่ ${termIndex} เรียบร้อยแล้ว`)
    } catch (err: any) { 
      toast.error(`บันทึกไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`) 
    } finally {
      setSaving(false)
    }
  }

  const handleRemind = async () => {
    setSendingRemind(true)
    try {
      const res = await fetch('/api/cron/remind')
      const data = await res.json()
      if (data.success) {
        toast.success('ส่งแจ้งเตือนการบันทึกสถิติเรียบร้อยแล้ว')
      } else if (data.message) {
        toast.info(`ข้ามการแจ้งเตือน: ${data.message}`)
      } else {
        toast.error(`แจ้งเตือนไม่สำเร็จ: ${data.error || 'ไม่ทราบสาเหตุ'}`)
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งแจ้งเตือน')
    } finally {
      setSendingRemind(false)
    }
  }

  const handleReport = async () => {
    setSendingReport(true)
    try {
      const res = await fetch('/api/cron/report')
      const data = await res.json()
      if (data.success) {
        toast.success('ส่งรายงานสถิติประจำวันเรียบร้อยแล้ว')
      } else if (data.message) {
        toast.info(`ข้ามการรายงาน: ${data.message}`)
      } else {
        toast.error(`รายงานไม่สำเร็จ: ${data.error || 'ไม่ทราบสาเหตุ'}`)
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งรายงาน')
    } finally {
      setSendingReport(false)
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

          <TabsContent value="settings" className="space-y-6">
            {/* ปีการศึกษาและภาคเรียน */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ปีการศึกษาและภาคเรียน</CardTitle>
                <CardDescription>
                  กำหนดช่วงเวลาของภาคเรียน ระบบจะใช้วันที่ปัจจุบันเพื่อคำนวณภาคเรียนอัตโนมัติ 
                  หากอยู่นอกช่วงเวลาทั้งสอง ระบบจะถือว่าเป็นช่วง &quot;ปิดเทอม&quot;
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="academicYear">ปีการศึกษา (พ.ศ.)</Label>
                  <Input 
                    id="academicYear" 
                    type="number" 
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  {/* ภาคเรียนที่ 1 */}
                  <div className="space-y-4 rounded-lg border border-slate-200 p-4">
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
                    <Button 
                      className="w-full" 
                      onClick={() => saveTerm(1)}
                      disabled={savingTerm1}
                    >
                      {savingTerm1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      บันทึกภาคเรียนที่ 1
                    </Button>
                  </div>

                  {/* ภาคเรียนที่ 2 */}
                  <div className="space-y-4 rounded-lg border border-slate-200 p-4">
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
                    <Button 
                      className="w-full" 
                      onClick={() => saveTerm(2)}
                      disabled={savingTerm2}
                    >
                      {savingTerm2 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      บันทึกภาคเรียนที่ 2
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* แจ้งเตือน LINE */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">แจ้งเตือน LINE</CardTitle>
                <CardDescription>
                  ส่งแจ้งเตือนหรือรายงานสถิติไปยังกลุ่มไลน์ด้วยตนเอง (ใช้ในกรณีที่ระบบอัตโนมัติไม่ทำงาน)
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleRemind}
                  disabled={sendingRemind}
                  className="h-12 gap-2 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
                >
                  {sendingRemind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  แจ้งเตือนการบันทึกสถิติ
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReport}
                  disabled={sendingReport}
                  className="h-12 gap-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  {sendingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                  รายงานสถิติประจำวัน
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
