import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getZoomApiClient, findCredentialForMeeting } from '@/lib/zoom'

/**
 * GET endpoint to retrieve all instances (occurrences) of a Zoom meeting
 *
 * @param request Request object
 * @param context Context containing meeting ID params
 * @returns JSON response with meeting instances or error
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meetingId = params.id
    if (!meetingId) {
      return NextResponse.json({ error: 'Missing meeting ID' }, { status: 400 })
    }

    // Find the correct credential for this specific meeting
    const credential = await findCredentialForMeeting(meetingId)

    // Get a Zoom API client authenticated for that credential
    const { apiClient } = await getZoomApiClient(credential)

    // Call Zoom API to get meeting instances
    const response = await apiClient.get(
      `/past_meetings/${meetingId}/instances`,
    )
    return NextResponse.json(response.data)
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    console.error('Failed to fetch meeting instances:', errorMessage)
    return NextResponse.json(
      {
        error: 'Failed to fetch meeting instances',
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
