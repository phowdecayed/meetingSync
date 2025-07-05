import { getMeetings } from '@/lib/data';
import { MeetingsViewTabs } from '@/components/meetings-view-tabs';

export default async function AllMeetingsPage() {
  const allMeetings = await getMeetings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">All Meetings</h1>
        <p className="text-muted-foreground">Browse and manage all of your past and upcoming meetings.</p>
      </div>
      <MeetingsViewTabs meetings={allMeetings} />
    </div>
  );
}
