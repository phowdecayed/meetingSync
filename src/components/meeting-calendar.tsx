'use client';

import { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { type Meeting } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, User } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';

type MeetingCalendarProps = {
  meetings: Meeting[];
};

export function MeetingCalendar({ meetings }: MeetingCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  const meetingsByDay = meetings.reduce((acc, meeting) => {
    const day = format(new Date(meeting.date), 'yyyy-MM-dd');
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  const daysWithMeetings = Object.keys(meetingsByDay).map(dayStr => {
      const [year, month, day] = dayStr.split('-').map(Number);
      return new Date(year, month - 1, day);
  });
  
  const selectedDayMeetings = selectedDay ? meetings.filter(m => isSameDay(new Date(m.date), selectedDay)) : [];

  return (
    <Card>
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                modifiers={{ hasMeeting: daysWithMeetings }}
                modifiersClassNames={{ hasMeeting: 'rdp-day_has-meeting' }}
                className="md:col-span-1 border rounded-lg p-2"
            />
            <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">
                Meetings on {selectedDay ? format(selectedDay, 'PPP') : '...'}
                </h3>
                <div className="space-y-4 h-[450px] overflow-y-auto pr-2">
                    {selectedDayMeetings.length > 0 ? (
                    selectedDayMeetings.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(meeting => (
                        <div key={meeting.id} className="p-4 rounded-lg border">
                        <h4 className="font-semibold">{meeting.title}</h4>
                        <div className="flex items-center text-sm text-muted-foreground mt-2">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>{format(new Date(meeting.date), 'p')} ({meeting.duration} min)</span>
                        </div>
                        {meeting.participants.length > 0 && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <User className="mr-2 h-4 w-4" />
                                <span className="truncate">{meeting.participants.join(', ')}</span>
                            </div>
                        )}
                        </div>
                    ))
                    ) : (
                    <p className="text-muted-foreground pt-4">No meetings scheduled for this day.</p>
                    )}
                </div>
            </div>
            </div>
        </CardContent>
    </Card>
  );
}
