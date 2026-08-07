import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subscription, email } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
    }

    const { endpoint, keys: { p256dh, auth } } = subscription

    // Save or update subscription
    await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh,
        auth,
        email: email || null
      },
      create: {
        endpoint,
        p256dh,
        auth,
        email: email || null
      }
    })

    return NextResponse.json({ success: true, message: 'Subscription saved' })
  } catch (error) {
    console.error('Save Push Subscription Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
    }

    await db.pushSubscription.deleteMany({
      where: { endpoint }
    })

    return NextResponse.json({ success: true, message: 'Subscription removed' })
  } catch (error) {
    console.error('Remove Push Subscription Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
