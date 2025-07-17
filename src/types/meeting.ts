export type MeetingStatus = 'past' | 'ongoing' | 'upcoming'

export type UnifiedMeeting = {
  id: string
  title: string
  description: string | null
  start: string
  end: string
  organizerName: string
  status: MeetingStatus
  meetingId?: string | null
  meetingType: 'internal' | 'external'
  meetingRoom: string | null
  isZoomMeeting: boolean
  source: 'local' | 'zoom'
  participants?: string[]
  duration?: number
  // Zoom-specific fields for hybrid meetings
  zoomJoinUrl?: string | null
  zoomPassword?: string | null
  zoomMeetingId?: string | null
  organizerId?: string
}
