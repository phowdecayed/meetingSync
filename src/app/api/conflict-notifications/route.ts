import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for notifications (in production, you'd use a database or Redis)
let notifications: any[] = []

export async function GET() {
  try {
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, notificationId } = await request.json()

    if (action === 'mark_read' && notificationId) {
      notifications = notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n,
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'clear_all') {
      notifications = []
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
      },
      { status: 400 },
    )
  } catch (error) {
    console.error('Error handling notification action:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    )
  }
}
