import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

export async function GET(
  request: Request,
  context: { params: Params }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Destructure params safely 
    const { id: zoomMeetingId } = context.params;
    
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