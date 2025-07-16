'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import listPlugin from '@fullcalendar/list'
import { EventContentArg } from '@fullcalendar/core'
import { Loader2, Maximize, Minimize } from 'lucide-react'
import { id } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { Badge } from '@/components/ui/badge'

type MeetingStatus = 'Akan Datang' | 'Sedang Berlangsung' | 'Selesai'

type PublicMeeting = {
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
}

function EventDetail({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  if (!value) return null
  return (
    <div className="text-xs">
      <span className="font-semibold">{label}:</span>
      <span className="text-muted-foreground ml-2">{value}</span>
    </div>
  )
}

function EventCard({
  event,
  isDark,
}: {
  event: EventContentArg['event']
  isDark: boolean
}) {
  const formatMeetingId = (id: string) => {
    if (!id || id.length !== 11) return id
    return `${id.slice(0, 3)} ${id.slice(3, 7)} ${id.slice(7)}`
  }

  const { status, meetingType, meetingId, meetingRoom } = event.extendedProps

  const getStatusVariant = (): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'Sedang Berlangsung':
        return 'default'
      case 'Akan Datang':
        return 'secondary'
      case 'Selesai':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div
      className={`h-full w-full rounded-lg p-4 shadow-md transition-all duration-300 ease-in-out ${
        status === 'Sedang Berlangsung'
          ? 'border-l-4 border-green-500 bg-green-500/20'
          : isDark
            ? 'bg-gray-800/60 hover:bg-gray-700/80'
            : 'bg-white/80 hover:bg-gray-50/90'
      } backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-primary flex-1 truncate text-base font-bold">
          {event.title}
        </p>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge
            variant={meetingType === 'internal' ? 'destructive' : 'secondary'}
            className="capitalize"
          >
            {meetingType}
          </Badge>
          <Badge variant={getStatusVariant()}>{status}</Badge>
        </div>
      </div>
      <div className="border-border mt-2 space-y-1 border-l-2 pl-3">
        <EventDetail
          label="Agenda Rapat"
          value={event.extendedProps.description}
        />
        <EventDetail
          label="Penanggung Jawab"
          value={event.extendedProps.organizerName}
        />
        {meetingRoom && <EventDetail label="Ruang Rapat" value={meetingRoom} />}
        {meetingType === 'external' && (
          <EventDetail label="Meeting ID" value={formatMeetingId(meetingId)} />
        )}
      </div>
    </div>
  )
}

export default function PublicCalendar() {
  const [meetings, setMeetings] = useState<PublicMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const calendarRef = useRef<FullCalendar>(null)

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const response = await fetch('/api/public/meetings')
        if (!response.ok) throw new Error('Failed to fetch meetings')
        const data = await response.json()
        setMeetings(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchMeetings()
  }, [])

  const calendarEvents = useMemo(
    () =>
      meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        start: new Date(meeting.start),
        end: new Date(meeting.end),
        extendedProps: {
          organizerName: meeting.organizerName,
          status: meeting.status,
          meetingId: meeting.meetingId,
          description: meeting.description,
          meetingType: meeting.meetingType,
          meetingRoom: meeting.meetingRoom,
        },
      })),
    [meetings],
  )

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="text-primary h-12 w-12 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:via-blue-900/50 dark:to-indigo-900/60">
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          className="bg-white/50 backdrop-blur-sm dark:bg-gray-800/50"
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </Button>
      </div>
      <div className="h-full w-full overflow-hidden rounded-2xl bg-white/30 shadow-2xl backdrop-blur-xl dark:bg-gray-800/30">
        <FullCalendar
          ref={calendarRef}
          plugins={[listPlugin]}
          initialView="listWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '', // Remove view-switching buttons
          }}
          events={calendarEvents}
          height="100%"
          locale={id}
          eventContent={(arg) => (
            <EventCard event={arg.event} isDark={isDark} />
          )}
          themeSystem="standard"
          viewClassNames={isDark ? 'fc-theme-dark' : 'fc-theme-standard'}
        />
      </div>
      <style jsx global>{`
        .fc-theme-dark .fc-list-day-cushion {
          background-color: rgba(31, 41, 55, 0.5) !important;
        }
        .fc-theme-dark .fc-list-table {
          color: #e5e7eb !important;
        }
        .fc-theme-dark .fc-list-event:hover td {
          background-color: rgba(55, 65, 81, 0.7) !important;
        }
        .fc .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .fc .fc-button {
          text-transform: capitalize;
        }
        .fc-list-event-time {
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}
