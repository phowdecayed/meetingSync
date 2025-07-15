import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMeetings } from '@/lib/data'
import { listZoomMeetings } from '@/lib/zoom'

// This type is a simplified version of what the ZoomCalendar component expects.
type CalendarMeeting = {
  id: number // Zoom Meeting ID
  topic: string
  start_time: string
  duration: number
  join_url: string
  password?: string
  description?: string
  isOwner: boolean
}

export async function GET() {
  try {
    const session = await auth()
    const user = session?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch all meetings for the current user from our local database.
    // This tells us which meetings the user should see.
    const userMeetingsFromDb = await getMeetings(user)
    const userMeetingIds = new Set(
      userMeetingsFromDb.map((m) => m.zoomMeetingId).filter(Boolean),
    )

    // 2. Fetch all meetings from the Zoom API.
    // This gives us the latest, real-time information.
    const zoomApiResult = await listZoomMeetings()

    // 3. Filter the real-time Zoom meetings to include only those relevant to our user.
    const relevantZoomMeetings = zoomApiResult.meetings.filter((zm) =>
      userMeetingIds.has(zm.id.toString()),
    )

    // 4. Correlate and transform the data for the frontend.
    const calendarMeetings: CalendarMeeting[] = relevantZoomMeetings.map(
      (zm) => {
        // Find the corresponding meeting from our DB to check ownership.
        const dbMeeting = userMeetingsFromDb.find(
          (m) => m.zoomMeetingId === zm.id.toString(),
        )

        return {
          id: zm.id,
          topic: zm.topic,
          start_time: zm.start_time,
          duration: zm.duration,
          join_url: zm.join_url,
          password: zm.password,
          description: zm.agenda,
          // isOwner is true if the logged-in user is the organizer.
          isOwner: dbMeeting ? dbMeeting.organizerId === user.id : false,
        }
      },
    )

    return NextResponse.json({
      meetings: calendarMeetings,
      nextPageToken: zoomApiResult.next_page_token || null,
    })
  } catch (error) {
    console.error('Error fetching and correlating meetings:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json(
      { error: `Failed to fetch meetings: ${errorMessage}` },
      { status: 500 },
    )
  }
}
