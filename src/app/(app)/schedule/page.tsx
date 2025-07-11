import { getMeetings, type Meeting } from "@/lib/data";
import { auth } from "@/lib/auth";
import { MeetingsViewTabs } from "@/components/meetings-view-tabs";

export default async function SchedulePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    // This should be handled by middleware, but it's a good safeguard.
    return <div>Not authenticated.</div>;
  }

  const allMeetings = await getMeetings();

  const userMeetings = allMeetings
    .filter((m) => {
      // Admin users see all meetings on their schedule
      if (user.role === "admin") {
        return true;
      }

      return (
        m.organizerId === user.id || m.participants.includes(user.email ?? "")
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">My Schedule</h1>
        <p className="text-muted-foreground">
          Your upcoming meetings and appointments.
        </p>
      </div>

      <MeetingsViewTabs meetings={userMeetings} />
    </div>
  );
}
