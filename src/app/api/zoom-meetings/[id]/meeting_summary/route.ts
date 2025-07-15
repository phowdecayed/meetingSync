import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getZoomMeetingSummary } from '@/lib/zoom'

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 },
      )
    }

    const zoomMeetingId = params.id
    if (!zoomMeetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 },
      )
    }

    // Get the meeting summary from Zoom API directly using the Zoom Meeting ID
    const summary = await getZoomMeetingSummary(zoomMeetingId)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching meeting summary:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch meeting summary' },
      { status: 500 },
    )
  }
}
