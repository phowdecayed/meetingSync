import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMeetingById, updateMeeting } from '@/lib/data';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      );
    }

    const meetingId = params.id;
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();

    // Verify that the user is the organizer of the meeting
    const meeting = await getMeetingById(meetingId);
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    if (meeting.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only edit your own meetings' },
        { status: 403 }
      );
    }

    const updatedMeeting = await updateMeeting(meetingId, data);
    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update meeting' },
      { status: 500 }
    );
  }
}
