import { NextResponse } from 'next/server'

// Historical attendance records must not be rewritten when enrollment changes.
export async function GET() {
  return NextResponse.json({ error: 'การปรับยอดย้อนหลังอัตโนมัติถูกยกเลิกแล้ว' }, { status: 410 })
}
