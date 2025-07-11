import { getMeetings, getUsers, type User } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BarChart as BarChartIcon, Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, addDays, isSameDay, eachDayOfInterval } from "date-fns";
import { MeetingsOverviewChart } from "@/components/meetings-overview-chart";
import { auth } from "@/lib/auth";

function getInitials(name: string = ""): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const [allMeetings, allUsers] = await Promise.all([
    getMeetings(),
    getUsers(),
  ]);

  if (!user) {
    // This case should be handled by middleware, but it's good practice
    // to have a fallback.
    return (
      <div className="flex h-full items-center justify-center">
        <p>You need to be signed in to view this page.</p>
      </div>
    );
  }

  const userMeetings = allMeetings.filter((m) => {
    if (user.role === "admin") return true;
    return (
      m.organizerId === user.id || m.participants.includes(user.email ?? "")
    );
  });

  const now = new Date();

  const userMap = new Map(allUsers.map((user) => [user.id, user]));

  const upcomingMeetings = userMeetings.filter((m) => new Date(m.date) >= now);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const meetingsThisWeek = userMeetings.filter((m) => {
    const meetingDate = new Date(m.date);
    return meetingDate >= startOfWeek && meetingDate < endOfWeek;
  });

  const totalMeetingsThisWeek = meetingsThisWeek.length;

  const totalDurationThisWeek = meetingsThisWeek.reduce(
    (acc, m) => acc + m.duration,
    0,
  );

  // Data for overview chart (based on user's meetings)
  const nextSevenDays = eachDayOfInterval({ start: now, end: addDays(now, 6) });
  const chartData = nextSevenDays.map((day) => ({
    date: format(day, "EEE"),
    meetings: userMeetings.filter((m) => isSameDay(new Date(m.date), day))
      .length,
  }));

  // Data for upcoming meetings list
  const next5UpcomingMeetings = upcomingMeetings
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-headline font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            An overview of your meeting schedule.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              My Upcoming Meetings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">
              Your scheduled upcoming meetings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              My Meetings this Week
            </CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMeetingsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Meetings you are attending or organizing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Time in Meetings (My Week)
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalDurationThisWeek / 60).toFixed(1)} hours
            </div>
            <p className="text-xs text-muted-foreground">
              Your total scheduled meeting time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <MeetingsOverviewChart chartData={chartData} />
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
            <CardDescription>
              Your next five scheduled meetings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {next5UpcomingMeetings.length > 0 ? (
                next5UpcomingMeetings.map((meeting) => {
                  const organizer = userMap.get(meeting.organizerId);
                  return (
                    <div key={meeting.id} className="flex items-center">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`https://xsgames.co/randomusers/avatar.php?g=pixel&name=${encodeURIComponent(organizer?.name ?? "")}`}
                          alt={organizer?.name ?? ""}
                          data-ai-hint="user avatar"
                        />
                        <AvatarFallback>
                          {getInitials(organizer?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {meeting.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(meeting.date), "E, MMM d, p")}
                        </p>
                      </div>
                      <div className="ml-auto text-sm text-muted-foreground">
                        {meeting.duration}m
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    No upcoming meetings.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
