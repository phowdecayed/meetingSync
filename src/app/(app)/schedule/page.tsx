import { MeetingsViewTabs } from '@/components/meetings-view-tabs'

export default async function SchedulePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">My Schedule</h1>
        <p className="text-muted-foreground">
          Your upcoming meetings and appointments.
        </p>
      </div>

      <MeetingsViewTabs />
    </div>
  )
}
