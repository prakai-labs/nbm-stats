import { NextRequest, NextResponse } from 'next/server'
import { replyMessage } from '@/lib/line-api'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // LINE sends an array of events
    if (body.events && body.events.length > 0) {
      for (const event of body.events) {
        // เมื่อบอทถูกเชิญเข้ากลุ่ม
        if (event.type === 'join' && event.source.type === 'group') {
          const groupId = event.source.groupId
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: `สวัสดีครับ! ขอบคุณที่เชิญระบบสถิติเข้ากลุ่ม\n\nGroup ID ของห้องนี้คือ:\n${groupId}\n\n(กรุณาคัดลอก Group ID ด้านบนไปแจ้งผู้ดูแลระบบเพื่อเปิดใช้งานการแจ้งเตือนครับ)`
            }
          ])
        }
        
        // พิมพ์ขอดู ID ในกลุ่มได้ หรือแค่ดูจาก Vercel Logs
        if (event.type === 'message' && event.message.type === 'text') {
          if (event.source.type === 'group') {
            // Log ID เงียบๆ ไว้ใน Vercel ให้แอดมินเข้าไปดูได้
            console.log('🟢 [LINE GROUP ID]:', event.source.groupId)
            
            const text = event.message.text.toLowerCase()
            if (text === 'id' || text === 'group id') {
              await replyMessage(event.replyToken, [
                {
                  type: 'text',
                  text: `Group ID ของห้องนี้คือ:\n${event.source.groupId}`
                }
              ])
            }
          }
        }
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
