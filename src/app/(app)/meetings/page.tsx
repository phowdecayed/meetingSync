import { getMeetings } from '@/lib/data';
import { MeetingsViewTabs } from '@/components/meetings-view-tabs';
import { auth } from '@/lib/auth';

export default async function AllMeetingsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    // This should be handled by middleware, but it's a good safeguard.
    return <div>Not authenticated.</div>
  }

  const allMeetings = await getMeetings();
  
  const userMeetings = allMeetings.filter(m => {
    // Admins see all meetings.
    if (user.role === 'admin') {
      return true;
    }
    // Members see meetings they organize or are invited to.
    return m.organizerId === user.id || (user.email && m.participants.includes(user.email));
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">My Meetings</h1>
        <p className="text-muted-foreground">Browse and manage all of your past and upcoming meetings.</p>
      </div>
      <MeetingsViewTabs meetings={userMeetings} />
    </div>
  );
}
