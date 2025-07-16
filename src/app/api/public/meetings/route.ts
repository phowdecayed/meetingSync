import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { addMinutes } from 'date-fns'

type MeetingStatus = 'Akan Datang' | 'Sedang Berlangsung' | 'Selesai'

// Simplified public meeting type
export type PublicMeeting = {
  id: string
  title: string
  description: string | null
  start: Date
  end: Date
  organizerName: string
  meetingId?: string | null
  status: MeetingStatus
  meetingType: 'internal' | 'external'
}

// Helper to determine the meeting status
function getMeetingStatus(start: Date, duration: number): MeetingStatus {
  const now = new Date()
  const meetingEnd = addMinutes(start, duration)

  if (now < start) return 'Akan Datang'
  if (now >= start && now <= meetingEnd) return 'Sedang Berlangsung'
  return 'Selesai'
}

export async function GET() {
  try {
    const now = new Date()

    const meetings = await prisma.meeting.findMany({
      where: {
        // Fetch meetings from the last hour and all upcoming
        date: {
          gte: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        },
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        organizer: {
          select: {
            name: true,
          },
        },
      },
    })

    const publicMeetings: PublicMeeting[] = meetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      start: meeting.date,
      end: addMinutes(meeting.date, meeting.duration),
      organizerName: meeting.organizer?.name || 'Unknown Organizer',
      status: getMeetingStatus(meeting.date, meeting.duration),
      meetingId: meeting.zoomMeetingId,
      meetingType: meeting.meetingType as 'internal' | 'external',
    }))

    return NextResponse.json(publicMeetings)
  } catch (error) {
    console.error('Error fetching public meetings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch public meetings' },
      { status: 500 },
    )
  }
}
