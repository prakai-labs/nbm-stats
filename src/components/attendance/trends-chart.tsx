'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatThaiDateShort } from './utils'

interface TrendsChartProps {
  days?: number
}

interface TrendPoint {
  date: string
  totalMale: number
  totalFemale: number
  total: number
  presentMale: number
  presentFemale: number
  present: number
  sickMale: number
  sickFemale: number
  sick: number
  leaveMale: number
  leaveFemale: number
  leave: number
  absentMale: number
  absentFemale: number
  absent: number
}

export function TrendsChart({ days = 7 }: TrendsChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['trends', days],
    queryFn: async () => {
      const res = await fetch(`/api/trends?days=${days}`)
      return res.json()
    },
    refetchInterval: 60000,
  })

  const trend: TrendPoint[] = data?.trend ?? []

  const chartData = trend.map((t) => ({
    date: formatThaiDateShort(t.date),
    'ชายมา': t.presentMale,
    'หญิงมา': t.presentFemale,
    'ชายป่วย': t.sickMale,
    'หญิงป่วย': t.sickFemale,
    'ชายลา': t.leaveMale,
    'หญิงลา': t.leaveFemale,
    'ชายขาด': t.absentMale,
    'หญิงขาด': t.absentFemale,
    'อัตราการมา': t.total > 0 ? (t.present / t.total) * 100 : 0,
  }))

  return (
    <Card className="border-emerald-100/80 shadow-sm">
      <CardHeader className="gap-2 border-b border-slate-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
          <BarChart3 className="h-4 w-4 text-emerald-600" />
          แนวโน้ม {days} วันล่าสุด (แยกชาย/หญิง)
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          แสดงจำนวนนักเรียนชาย/หญิงที่มาเรียน, ป่วย, ลา, ขาด ในแต่ละวัน พร้อมเส้นอัตราการมาเรียน
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            กำลังโหลดข้อมูล...
          </div>
        ) : trend.every((t) => t.total === 0) ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-sm text-slate-400">
            <TrendingUp className="h-10 w-10 opacity-50" />
            ยังไม่มีข้อมูลในช่วง {days} วันล่าสุด
            <span className="text-xs">เริ่มบันทึกข้อมูลวันนี้เพื่อดูแนวโน้ม</span>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'อัตราการมา') return [`${value.toFixed(1)}%`, name]
                    return [value, name]
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                {/* มาเรียน: stacked ชาย/หญิง */}
                <Bar yAxisId="left" dataKey="ชายมา" stackId="present" fill="#0ea5e9" />
                <Bar yAxisId="left" dataKey="หญิงมา" stackId="present" fill="#ec4899" radius={[4, 4, 0, 0]} />
                {/* ป่วย: stacked ชาย/หญิง */}
                <Bar yAxisId="left" dataKey="ชายป่วย" stackId="sick" fill="#fb7185" />
                <Bar yAxisId="left" dataKey="หญิงป่วย" stackId="sick" fill="#fda4af" />
                {/* ลา: stacked ชาย/หญิง */}
                <Bar yAxisId="left" dataKey="ชายลา" stackId="leave" fill="#fbbf24" />
                <Bar yAxisId="left" dataKey="หญิงลา" stackId="leave" fill="#fcd34d" />
                {/* ขาด: stacked ชาย/หญิง */}
                <Bar yAxisId="left" dataKey="ชายขาด" stackId="absent" fill="#f87171" />
                <Bar yAxisId="left" dataKey="หญิงขาด" stackId="absent" fill="#fca5a5" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="อัตราการมา"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#0d9488' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
