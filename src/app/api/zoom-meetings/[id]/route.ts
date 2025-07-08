import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deleteZoomMeeting } from '@/lib/zoom';

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
    const { id: zoomMeetingId } = await context.params;
    
    if (!zoomMeetingId) {
      return NextResponse.json({ error: 'Missing meeting ID' }, { status: 400 });
    }
    
    // Find the meeting in our database
    const meeting = await prisma.meeting.findFirst({
      where: {
        zoomMeetingId
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if the current user is the organizer
    const isOrganizer = meeting.organizerId === session.user.id;
    
    // Format participants as an array
    const participants = meeting.participants 
      ? meeting.participants.split(',').map(p => p.trim())
      : [];

    return NextResponse.json({
      id: zoomMeetingId,
      topic: meeting.title,
      description: meeting.description,
      start_time: meeting.date,
      duration: meeting.duration,
      join_url: meeting.zoomJoinUrl,
      password: meeting.zoomPassword,
      organizer: meeting.organizer,
      isOrganizer,
      participants
    });
  } catch (error) {
    console.error('Error fetching meeting details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting details' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: zoomMeetingId } = context.params;

    if (!zoomMeetingId) {
      return NextResponse.json({ error: 'Missing meeting ID' }, { status: 400 });
    }

    // Find the meeting in our database to ensure it exists and user has permission
    const meeting = await prisma.meeting.findFirst({
      where: { zoomMeetingId },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found in database' }, { status: 404 });
    }

    // Optional: Add an authorization check, e.g., only the organizer can delete
    if (meeting.organizerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Step 1: Delete from Zoom
    try {
      await deleteZoomMeeting(zoomMeetingId);
    } catch (zoomError: any) {
      // If the meeting is already gone from Zoom, we can proceed to delete from our DB
      // Zoom API returns 404 if meeting does not exist
      if (zoomError.response?.status !== 404) {
        console.error('Error deleting from Zoom:', zoomError);
        throw new Error('Failed to delete meeting from Zoom.');
      }
    }

    // Step 2: Delete from our database
    await prisma.meeting.delete({
      where: { id: meeting.id },
    });

    return NextResponse.json({ message: 'Meeting deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
} 