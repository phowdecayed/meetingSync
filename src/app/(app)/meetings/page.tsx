import { MeetingsViewTabs } from "@/components/meetings-view-tabs";
import { auth } from "@/lib/auth";

export default async function AllMeetingsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    // This should be handled by middleware, but it's a good safeguard.
    return <div>Not authenticated.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">My Meetings</h1>
        <p className="text-muted-foreground">
          Browse and manage all of your past and upcoming meetings.
        </p>
      </div>
      <MeetingsViewTabs />
    </div>
  );
}
