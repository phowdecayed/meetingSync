'use client';

import { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { type Meeting } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Clock, User, Eye } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from './ui/button';
import { MeetingDetailsDialog } from './meeting-details-dialog';

type MeetingCalendarProps = {
  meetings: Meeting[];
};

export function MeetingCalendar({ meetings }: MeetingCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [meetingToView, setMeetingToView] = useState<Meeting | null>(null);

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
    <>
        <Card>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDay}
                        onSelect={setSelectedDay}
                        modifiers={{ hasMeeting: daysWithMeetings }}
                        modifiersClassNames={{ hasMeeting: 'rdp-day_has-meeting' }}
                        className="border rounded-lg p-2"
                    />
                </div>
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">
                    Meetings on {selectedDay ? format(selectedDay, 'PPP') : '...'}
                    </h3>
                    <div className="space-y-4 h-[300px] lg:h-[450px] overflow-y-auto pr-2">
                        {selectedDayMeetings.length > 0 ? (
                        selectedDayMeetings.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(meeting => (
                            <Card key={meeting.id} className="flex flex-col">
                                <CardHeader className="py-4">
                                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 flex-grow pt-0">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="mr-2 h-4 w-4" />
                                        <span>{format(new Date(meeting.date), 'p')} ({meeting.duration} min)</span>
                                    </div>
                                    {meeting.participants.length > 0 && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <User className="mr-2 h-4 w-4" />
                                            <span className="truncate">{meeting.participants.join(', ')}</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Button variant="outline" className="w-full" onClick={() => setMeetingToView(meeting)}>
                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                        ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground pt-4">No meetings scheduled for this day.</p>
                        </div>
                        )}
                    </div>
                </div>
                </div>
            </CardContent>
        </Card>
        <MeetingDetailsDialog 
            isOpen={!!meetingToView}
            onClose={() => setMeetingToView(null)}
            meeting={meetingToView}
        />
    </>
  );
}
