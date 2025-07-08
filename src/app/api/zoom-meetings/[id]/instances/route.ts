import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getZoomApiClient } from '@/lib/zoom';

/**
 * GET endpoint to retrieve all instances (occurrences) of a Zoom meeting
 * 
 * @param request Request object
 * @param context Context containing meeting ID params
 * @returns JSON response with meeting instances or error
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Correctly await params before accessing the id property
    const { id: meetingId } = await context.params;
    if (!meetingId) {
      return NextResponse.json({ error: 'Missing meeting ID' }, { status: 400 });
    }

    // Get Zoom API client
    const zoomClient = await getZoomApiClient();
    
    // Call Zoom API to get meeting instances
    const response = await zoomClient.get(`/past_meetings/${meetingId}/instances`);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching meeting instances:', error.response?.data || error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting instances' },
      { status: error.response?.status || 500 }
    );
  }
} 