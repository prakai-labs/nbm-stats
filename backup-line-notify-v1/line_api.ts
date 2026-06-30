export async function replyMessage(replyToken: string, messages: any[]) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!CHANNEL_ACCESS_TOKEN) {
    console.error('No LINE_CHANNEL_ACCESS_TOKEN found')
    return
  }
  
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages
    })
  })
  
  if (!res.ok) {
    console.error('Failed to reply message:', await res.text())
  }
}

export async function pushMessage(to: string, messages: any[]) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!CHANNEL_ACCESS_TOKEN) {
    console.error('No LINE_CHANNEL_ACCESS_TOKEN found')
    return
  }
  
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to,
      messages
    })
  })
  
  if (!res.ok) {
    console.error('Failed to push message:', await res.text())
  }
}
