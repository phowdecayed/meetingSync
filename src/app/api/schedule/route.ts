import { NextResponse } from 'next/server'
import { listZoomMeetings } from '@/lib/zoom'
import { addMinutes } from 'date-fns'
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
    // Always get all meetings like public calendar to ensure consistency
    const meetings = await prisma.meeting.findMany({
      include: {
        organizer: true,
        meetingRoom: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    const localMeetings = meetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      date: meeting.date,
      duration: meeting.duration,
      organizerId: meeting.organizer?.name || 'Unknown Organizer',
      organizerIdRaw: meeting.organizerId, // Keep the raw ID for comparison
      zoomMeetingId: meeting.zoomMeetingId,
      zoomJoinUrl: meeting.zoomJoinUrl,
      zoomPassword: meeting.zoomPassword,
      meetingType: meeting.meetingType as 'internal' | 'external',
      meetingRoomId: meeting.meetingRoom
        ? `${meeting.meetingRoom.name} - ${meeting.meetingRoom.location}`
        : null,
      isZoomMeeting: meeting.isZoomMeeting,
      participants: meeting.participants,
    }))

    const zoomMeetings = await listZoomMeetings()

    const formattedLocalMeetings = localMeetings.map((meeting) => {
      const start = new Date(meeting.date)
      const end = new Date(start.getTime() + meeting.duration * 60 * 1000)
      return {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        start: start.toISOString(),
        end: end.toISOString(),
        duration: meeting.duration,
        organizerName: meeting.organizerId || 'Unknown Organizer',
        status: getMeetingStatus(start, end),
        meetingId: meeting.zoomMeetingId,
        meetingType: meeting.meetingType,
        meetingRoom: meeting.meetingRoomId || null,
        isZoomMeeting: meeting.isZoomMeeting,
        participants: meeting.participants
          ? meeting.participants.split(',').map((p) => p.trim())
          : [],
        source: 'local',
        // Add Zoom-specific fields for hybrid meetings
        zoomJoinUrl: meeting.zoomJoinUrl || null,
        zoomPassword: meeting.zoomPassword || null,
        zoomMeetingId: meeting.zoomMeetingId || null,
        organizerId: meeting.organizerIdRaw,
      }
    })

    // Get all Zoom meeting IDs that are already stored as local hybrid meetings
    const localZoomMeetingIds = new Set(
      localMeetings
        .filter((meeting) => meeting.zoomMeetingId)
        .map((meeting) => meeting.zoomMeetingId),
    )

    // Filter out Zoom meetings that already exist as local hybrid meetings
    const formattedZoomMeetings = zoomMeetings.meetings
      .filter((meeting) => !localZoomMeetingIds.has(meeting.id.toString()))
      .map((meeting) => {
        const start = new Date(meeting.start_time)
        const end = addMinutes(start, meeting.duration)
        return {
          id: meeting.id.toString(),
          title: meeting.topic,
          description: meeting.agenda,
          start: start.toISOString(),
          end: end.toISOString(),
          duration: meeting.duration,
          organizerName: 'Zoom',
          status: getMeetingStatus(start, end),
          meetingId: meeting.id.toString(),
          meetingType: 'external',
          meetingRoom: null,
          isZoomMeeting: true,
          source: 'zoom',
        }
      })

    const allMeetings = [...formattedLocalMeetings, ...formattedZoomMeetings]

    return NextResponse.json(allMeetings)
  } catch (error) {
    console.error('Failed to fetch schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 },
    )
  }
}
