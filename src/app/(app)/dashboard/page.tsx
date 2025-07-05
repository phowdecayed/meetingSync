import { getMeetings } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MeetingsTable } from '@/components/meetings-table';
import { BarChart, Calendar, Clock } from 'lucide-react';

export default async function DashboardPage() {
  const allMeetings = await getMeetings();
  const now = new Date();
  
  const upcomingMeetings = allMeetings.filter(m => new Date(m.date) >= now);
  const totalMeetingsThisWeek = allMeetings.filter(m => {
    const meetingDate = new Date(m.date);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return meetingDate >= startOfWeek && meetingDate < endOfWeek;
  }).length;
  
  const totalDurationThisWeek = allMeetings
    .filter(m => {
        const meetingDate = new Date(m.date);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return meetingDate >= startOfWeek && meetingDate < endOfWeek;
    })
    .reduce((acc, m) => acc + m.duration, 0);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Dashboard</h1>
        <p className="text-muted-foreground">An overview of your meeting schedule.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Total upcoming meetings scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings this Week</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMeetingsThisWeek}</div>
            <p className="text-xs text-muted-foreground">Across all linked accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time in Meetings (Weekly)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalDurationThisWeek / 60).toFixed(1)} hours</div>
            <p className="text-xs text-muted-foreground">Total scheduled meeting time</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <MeetingsTable initialMeetings={allMeetings} />
      </div>
    </div>
  );
}
