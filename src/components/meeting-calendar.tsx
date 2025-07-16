'use client'

import { useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { type Meeting } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Clock,
  Link as LinkIcon,
  Info,
  Users,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from './ui/badge'

type MeetingCalendarProps = {
  meetings: Meeting[]
}

export function MeetingCalendar({ meetings }: MeetingCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date())

  const meetingsByDay = meetings.reduce(
    (acc, meeting) => {
      const day = format(new Date(meeting.date), 'yyyy-MM-dd')
      if (!acc[day]) {
        acc[day] = []
      }
      acc[day].push(meeting)
      return acc
    },
    {} as Record<string, Meeting[]>,
  )

  const daysWithMeetings = Object.keys(meetingsByDay).map((dayStr) => {
    const [year, month, day] = dayStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  })

  const selectedDayMeetings = selectedDay
    ? meetings.filter((m) => isSameDay(new Date(m.date), selectedDay))
    : []

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
            <div className="flex justify-center lg:col-span-1">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                modifiers={{ hasMeeting: daysWithMeetings }}
                modifiersClassNames={{ hasMeeting: 'rdp-day_has-meeting' }}
                className="rounded-lg border p-2"
              />
            </div>
            <div className="lg:col-span-2">
              <h3 className="mb-4 text-lg font-semibold">
                Meetings on {selectedDay ? format(selectedDay, 'PPP') : '...'}
              </h3>
              <div className="h-[300px] space-y-4 overflow-y-auto pr-2 lg:h-[450px]">
                {selectedDayMeetings.length > 0 ? (
                  selectedDayMeetings
                    .sort(
                      (a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime(),
                    )
                    .map((meeting) => {
                      const zoomLink =
                        meeting.zoomJoinUrl ||
                        (meeting.zoomMeetingId
                          ? `https://zoom.us/j/${meeting.zoomMeetingId}`
                          : null)
                      return (
                        <Card key={meeting.id} className="flex flex-col">
                          <CardHeader className="py-4">
                            <CardTitle className="text-lg">
                              {meeting.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-0">
                            <div className="flex items-start gap-4">
                              <CalendarIcon className="text-muted-foreground mt-1 h-5 w-5" />
                              <div>
                                <h4 className="text-sm font-semibold">
                                  Date & Time
                                </h4>
                                <p className="text-muted-foreground text-sm">
                                  {format(new Date(meeting.date), 'PPPP p')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <Clock className="text-muted-foreground mt-1 h-5 w-5" />
                              <div>
                                <h4 className="text-sm font-semibold">
                                  Duration
                                </h4>
                                <p className="text-muted-foreground text-sm">
                                  {meeting.duration} minutes
                                </p>
                              </div>
                            </div>
                            {meeting.description && (
                              <div className="flex items-start gap-4">
                                <Info className="text-muted-foreground mt-1 h-5 w-5" />
                                <div>
                                  <h4 className="text-sm font-semibold">
                                    Description
                                  </h4>
                                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                                    {meeting.description}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-4">
                              <Users className="text-muted-foreground mt-1 h-5 w-5" />
                              <div>
                                <h4 className="text-sm font-semibold">
                                  Participants
                                </h4>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {meeting.participants &&
                                  typeof meeting.participants === 'string' &&
                                  meeting.participants.length > 0 ? (
                                    meeting.participants
                                      .split(',')
                                      .map((p: string) => (
                                        <Badge key={p} variant="secondary">
                                          {p.trim()}
                                        </Badge>
                                      ))
                                  ) : (
                                    <p className="text-muted-foreground text-sm">
                                      No participants other than the organizer.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <LinkIcon className="text-muted-foreground mt-1 h-5 w-5" />
                              <div>
                                <h4 className="text-sm font-semibold">
                                  Zoom Meeting Link
                                </h4>
                                {zoomLink ? (
                                  <a
                                    href={zoomLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-sm break-all hover:underline"
                                  >
                                    Join Zoom Meeting
                                  </a>
                                ) : (
                                  <p className="text-muted-foreground text-sm">
                                    No Zoom link available
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground pt-4">
                      No meetings scheduled for this day.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
