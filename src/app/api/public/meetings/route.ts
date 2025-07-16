import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

type MeetingStatus = 'Akan Datang' | 'Sedang Berlangsung' | 'Selesai'

function getMeetingStatus(start: Date, end: Date): MeetingStatus {
  const now = new Date()
  if (now < start) return 'Akan Datang'
  if (now >= start && now <= end) return 'Sedang Berlangsung'
  return 'Selesai'
}

export async function GET() {
  try {
    const meetings = await prisma.meeting.findMany({
      include: {
        organizer: true,
        meetingRoom: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    const publicMeetings = meetings.map((meeting) => {
      const start = new Date(meeting.date)
      const end = new Date(start.getTime() + meeting.duration * 60 * 1000)
      return {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start: start.toISOString(),
        end: end.toISOString(),
        organizerName: meeting.organizer?.name || 'Unknown Organizer',
        status: getMeetingStatus(start, end),
        meetingId: meeting.zoomMeetingId,
        meetingType: meeting.meetingType,
        meetingRoom: meeting.meetingRoom
          ? `${meeting.meetingRoom.name} - ${meeting.meetingRoom.location}`
          : null,
      }
    })
    return NextResponse.json(publicMeetings)
  } catch (error) {
    console.error('Failed to fetch public meetings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 },
    )
  }
}
