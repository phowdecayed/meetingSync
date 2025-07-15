import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/zoom-settings/host-key?zoomMeetingId=... - Get the host key for a specific meeting
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const zoomMeetingId = searchParams.get('zoomMeetingId')

    if (!zoomMeetingId) {
      return NextResponse.json(
        { error: 'zoomMeetingId query parameter is required' },
        { status: 400 },
      )
    }

    // Find the meeting and its associated credential
    const meeting = await prisma.meeting.findUnique({
      where: { zoomMeetingId },
      include: {
        zoomCredential: true, // Include the related ZoomCredentials
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (!meeting.zoomCredential) {
      return NextResponse.json(
        { error: 'No Zoom credential is associated with this meeting' },
        { status: 404 },
      )
    }

    // Return the host key from the correct credential
    return NextResponse.json({
      hostKey: meeting.zoomCredential.hostKey || '',
    })
  } catch (error) {
    console.error('Error fetching host key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch host key' },
      { status: 500 },
    )
  }
}
