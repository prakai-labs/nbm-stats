import { NextResponse } from 'next/server'

// Classroom counts are maintained by an administrator with an effective date.
export async function POST() {
  return NextResponse.json({ error: 'กรุณาตั้งจำนวนนักเรียนจากหน้าผู้ดูแลระบบ' }, { status: 410 })
}
