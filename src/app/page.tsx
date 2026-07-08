'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, LayoutDashboard, Sparkles, Loader2, FileText, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { SiteHeader } from '@/components/attendance/site-header'
import { SiteFooter } from '@/components/attendance/site-footer'
import { SummaryCards } from '@/components/attendance/summary-cards'
import { AttendanceForm } from '@/components/attendance/attendance-form'
import { TrendsChart } from '@/components/attendance/trends-chart'
import { HistoryTable } from '@/components/attendance/history-table'
import { CalendarView } from '@/components/attendance/calendar-view'
import { ReportView } from '@/components/attendance/report-view'
import { DailyLog } from '@/components/attendance/daily-log'
import { useSocketSync } from '@/components/attendance/use-socket-sync'
import { todayBangkok } from '@/components/attendance/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const TAB_KEY = 'bnnm-active-tab'

type TabKey = 'today' | 'calendar' | 'report'

export default function Home() {
  const todayStr = useMemo(() => todayBangkok(), [])
  const { data: session, status } = useSession()
  const router = useRouter()

  // ใช้ชื่อจาก Google session — ถ้าไม่มี ใช้ค่าว่าง
  const teacherName = session?.user?.name || session?.user?.email || ''
  const teacherEmail = session?.user?.email || ''

  const [date, setDate] = useState<string>(todayStr)
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'today'
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('tab')
    if (fromUrl === 'calendar' || fromUrl === 'today' || fromUrl === 'report') return fromUrl as TabKey
    return (localStorage.getItem(TAB_KEY) as TabKey) ?? 'today'
  })

  // บังคับ login — ถ้ายังไม่ล็อกอิน ส่งไปหน้า /login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=' + encodeURIComponent(window.location.pathname))
    }
  }, [status, router])


  useEffect(() => {
    localStorage.setItem(TAB_KEY, activeTab)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (activeTab === 'calendar') url.searchParams.set('tab', 'calendar')
      else url.searchParams.delete('tab')
      window.history.replaceState({}, '', url.toString())
    }
  }, [activeTab])

  const { data: semesterSettings } = useQuery({
    queryKey: ['semesterSettings'],
    queryFn: async () => {
      const res = await fetch('/api/settings/semester')
      if (!res.ok) return null
      return res.json()
    }
  })

  const { semesterDisplay, isHoliday } = useMemo(() => {
    if (!semesterSettings?.academicYear) return { semesterDisplay: '', isHoliday: false }
    const current = new Date(date)
    current.setHours(0,0,0,0)

    const hasTerm1 = semesterSettings.term1?.start && semesterSettings.term1?.end
    const hasTerm2 = semesterSettings.term2?.start && semesterSettings.term2?.end

    let activeTerm = ''
    if (hasTerm1) {
      const start = new Date(semesterSettings.term1.start)
      const end = new Date(semesterSettings.term1.end)
      start.setHours(0,0,0,0)
      end.setHours(23,59,59,999)
      if (current >= start && current <= end) activeTerm = '1'
    }
    if (!activeTerm && hasTerm2) {
      const start = new Date(semesterSettings.term2.start)
      const end = new Date(semesterSettings.term2.end)
      start.setHours(0,0,0,0)
      end.setHours(23,59,59,999)
      if (current >= start && current <= end) activeTerm = '2'
    }

    if (activeTerm) {
      return {
        semesterDisplay: `ภาคเรียนที่ ${activeTerm} ปีการศึกษา ${semesterSettings.academicYear}`,
        isHoliday: false
      }
    }

    // Only consider it a holiday if at least one term is configured
    if (hasTerm1 || hasTerm2) {
      return {
        semesterDisplay: `ปิดเทอม ปีการศึกษา ${semesterSettings.academicYear}`,
        isHoliday: true
      }
    }

    // No terms configured yet — just show academic year
    return {
      semesterDisplay: `ปีการศึกษา ${semesterSettings.academicYear}`,
      isHoliday: false
    }
  }, [date, semesterSettings])

  const {
    isConnected,
    selfSocketId,
    onlineUsers,
    editingSlots,
    startEditing,
    stopEditing,
    broadcastSaved,
  } = useSocketSync({
    userName: teacherName || 'คุณครู',
    onAttendanceUpdated: (e) => {
      if (e.by && e.by !== teacherName) {
        toast.info(`คุณครู${e.by} อัปเดตข้อมูลห้องหนึ่ง`, {
          description: 'ข้อมูลได้รับการอัปเดตอัตโนมัติ',
        })
      }
    },
    onEditingRejected: (slot) => {
      toast.warning(`คุณครู${slot.userName} กำลังแก้ข้อมูลห้องนี้อยู่`, {
        description: 'กรุณารอสักครู่แล้วลองใหม่',
      })
    },
  })

  const { data: summaryData } = useQuery({
    queryKey: ['summary', date],
    queryFn: async () => {
      const res = await fetch(`/api/summary?date=${date}`)
      return res.json()
    },
    refetchInterval: 15000,
  })

  const summary = summaryData?.summary ?? {
    totalMale: 0, totalFemale: 0, totalStudents: 0,
    presentMale: 0, presentFemale: 0, present: 0,
    sickMale: 0, sickFemale: 0, sick: 0,
    leaveMale: 0, leaveFemale: 0, leave: 0,
    absentMale: 0, absentFemale: 0, absent: 0,
    classroomCount: 0,
    grandTotal: 0,
    unreportedCount: 0,
  }

  const currentUserId = selfSocketId

  const handleSelectDateFromCalendar = (newDate: string) => {
    setDate(newDate)
    setActiveTab('today')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleExportExcel = () => {
    const [year, month] = date.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    window.open(`/api/export-excel?from=${from}&to=${to}`)
  }

  // แสดง loading ระหว่างรอ session
  if (status === 'loading' || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50/40 via-white to-white">
      <SiteHeader
        isConnected={isConnected}
        onlineCount={onlineUsers.length}
        todayStr={todayStr}
      />

      {/* Hero strip */}
      <section className="relative overflow-hidden border-b border-emerald-100/80 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2) 0%, transparent 50%)',
          }}
        />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            สถิตินักเรียนประจำวัน
          </h2>
          {semesterDisplay && (
            <div className="text-sm font-medium text-emerald-100/90 bg-black/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
              {semesterDisplay}
            </div>
          )}

          <div className="text-xs text-emerald-100/80">
            ล็อกอินในชื่อ: <strong>{teacherName}</strong>
            {teacherEmail && teacherEmail !== teacherName && (
              <span className="ml-2 opacity-75">({teacherEmail})</span>
            )}
          </div>

        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="today" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">รายวัน</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">ปฏิทิน</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">รายงาน PDF</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB: รายวัน */}
          <TabsContent value="today" className="space-y-6">
            <SummaryCards
              date={date}
              grandTotal={summary.grandTotal}
              unreportedCount={summary.unreportedCount}
              totalMale={summary.totalMale}
              totalFemale={summary.totalFemale}
              totalStudents={summary.totalStudents}
              presentMale={summary.presentMale}
              presentFemale={summary.presentFemale}
              present={summary.present}
              sickMale={summary.sickMale}
              sickFemale={summary.sickFemale}
              sick={summary.sick}
              leaveMale={summary.leaveMale}
              leaveFemale={summary.leaveFemale}
              leave={summary.leave}
              absentMale={summary.absentMale}
              absentFemale={summary.absentFemale}
              absent={summary.absent}
              classroomCount={summary.classroomCount}
            />

            {/* teacherName ถูก control โดย session — ส่ง handler ว่างไปเพื่อให้ฟอร์มยังทำงาน */}
{summary.totalStudents > 0 && ((summary.present / summary.totalStudents) * 100) < 80 && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>⚠️ อัตราการมาเรียนวันนี้ต่ำกว่า 80% ({((summary.present / summary.totalStudents) * 100).toFixed(1)}%) — กรุณาตรวจสอบ</span>
              </div>
            )}

            {isHoliday ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-slate-500">
                <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-700">ขณะนี้อยู่ในช่วงปิดเทอม</h3>
                <p className="text-sm">ไม่สามารถบันทึกสถิติได้ในขณะนี้</p>
              </div>
            ) : (
              <>
                <AttendanceForm
                  date={date}
                  onDateChange={setDate}
                  teacherName={teacherName}
                  onTeacherNameChange={() => {
                    /* ไม่อนุญาตให้แก้ชื่อ manual — ใช้ชื่อจาก Google เท่านั้น */
                  }}
                  editingSlots={editingSlots}
                  currentUserId={currentUserId}
                  onStartEditing={startEditing}
                  onStopEditing={stopEditing}
                  onSaved={broadcastSaved}
                  isAdmin={!!(session?.user as any)?.isAdmin}
                />

                <DailyLog date={date} teacherName={teacherName} />
              </>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <TrendsChart days={7} />
              </div>
              <div className="lg:col-span-2">
                <HistoryTable />
              </div>
            </div>
          </TabsContent>

          {/* TAB: ปฏิทิน */}
          <TabsContent value="calendar" className="space-y-4">
            <CalendarView
              initialDate={date}
              onSelectDate={handleSelectDateFromCalendar}
            />
          </TabsContent>

          {/* TAB: รายงาน PDF */}
          <TabsContent value="report" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">รายงาน</h2>
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel
              </button>
            </div>
            <ReportView />
          </TabsContent>
        </Tabs>
      </main>

      <SiteFooter />
    </div>
  )
}
