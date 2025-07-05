
"use client";

import { useEffect, useState } from 'react';
import { getMeetings, type Meeting } from '@/lib/data';
import { useAuthStore } from '@/store/use-auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2, User, Clock } from 'lucide-react';

export default function SchedulePage() {
  const { user } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAndFilterMeetings() {
      if (!user) {
        setIsLoading(false);
        return;
      };
      
      setIsLoading(true);
      const allMeetings = await getMeetings();
      const now = new Date();
      
      const userMeetings = allMeetings.filter(m => {
        const isUpcoming = new Date(m.date) >= now;
        if (!isUpcoming) {
            return false;
        }
        
        // Admin users see all upcoming meetings on their schedule
        if (user.role === 'admin') {
            return true;
        }
        
        return m.organizerId === user.id || m.participants.includes(user.email);
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setMeetings(userMeetings);
      setIsLoading(false);
    }

    fetchAndFilterMeetings();
  }, [user]);

  // Group meetings by date
  const groupedByDate = meetings.reduce((acc, meeting) => {
    const dateKey = format(new Date(meeting.date), 'PPPP'); // e.g., "Saturday, August 24th, 2024"
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">My Schedule</h1>
        <p className="text-muted-foreground">Your upcoming meetings and appointments.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : meetings.length === 0 ? (
        <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
                You have no upcoming meetings scheduled.
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
            {sortedDates.map(date => (
                <div key={date}>
                    <h2 className="text-xl font-semibold mb-4">{date}</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {groupedByDate[date].map(meeting => (
                            <Card key={meeting.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 flex-grow">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="mr-2 h-4 w-4" />
                                        <span>{format(new Date(meeting.date), 'p')} ({meeting.duration} min)</span>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <User className="mr-2 h-4 w-4" />
                                        <span className="truncate">{meeting.participants.join(', ')}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
