'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomCalendar } from '@/components/zoom-calendar';
import { Meeting } from '@/lib/data';

type MeetingsViewTabsProps = {
  meetings: Meeting[];
};

export function MeetingsViewTabs({ meetings }: MeetingsViewTabsProps) {
  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Zoom Meeting Calendar</CardTitle>
          <CardDescription>
            Currently showing only Zoom meetings. Internal scheduling is temporarily disabled.
          </CardDescription>
        </CardHeader>
      </Card>
        <ZoomCalendar />
    </div>
  );
}
