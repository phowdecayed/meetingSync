import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listZoomMeetings } from '@/lib/zoom';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const nextPageToken = url.searchParams.get('next_page_token') || undefined;

    // Get meetings from Zoom
    const result = await listZoomMeetings(nextPageToken);

    return NextResponse.json({
      meetings: result.meetings,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    console.error('Error fetching Zoom meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Zoom meetings' },
      { status: 500 }
    );
  }
} 