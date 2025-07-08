import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listZoomMeetings } from '@/lib/zoom';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const nextPageToken = url.searchParams.get('next_page_token') || undefined;

    const [zoomResult, dbMeetings] = await Promise.all([
      listZoomMeetings(nextPageToken),
      prisma.meeting.findMany({
        select: { id: true, zoomMeetingId: true },
      }),
    ]);

    const dbMeetingMap = new Map(dbMeetings.map(m => [m.zoomMeetingId, m.id]));

    const correlatedMeetings = zoomResult.meetings.map(zm => ({
      ...zm,
      dbId: dbMeetingMap.get(zm.id.toString()),
    }));

    return NextResponse.json({
      meetings: correlatedMeetings,
      nextPageToken: zoomResult.nextPageToken,
    });
  } catch (error) {
    console.error('Error fetching and correlating Zoom meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
} 