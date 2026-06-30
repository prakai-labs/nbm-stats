import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 })
  }
  const users = await db.userRole.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 })
  }
  const body = await req.json()
  const { email, role, name } = body
  if (!email || !role) {
    return NextResponse.json({ error: 'email และ role เป็นข้อมูลจำเป็น' }, { status: 400 })
  }
  if (!['admin', 'director', 'teacher'].includes(role)) {
    return NextResponse.json({ error: 'role ต้องเป็น admin, director หรือ teacher' }, { status: 400 })
  }
  const user = await db.userRole.upsert({
    where: { email: email.toLowerCase() },
    update: { role, name: name || undefined },
    create: { email: email.toLowerCase(), role, name: name || null },
  })
  return NextResponse.json({ user })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  await db.userRole.delete({ where: { email: email.toLowerCase() } })
  return NextResponse.json({ success: true })
}
