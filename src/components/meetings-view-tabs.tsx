'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleView } from '@/components/schedule-view';
import { ZoomCalendar } from '@/components/zoom-calendar';
import { Meeting } from '@/lib/data';

type MeetingsViewTabsProps = {
  meetings: Meeting[];
};

export function MeetingsViewTabs({ meetings }: MeetingsViewTabsProps) {
  return (
    <Tabs defaultValue="schedule" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="schedule">Jadwal Internal</TabsTrigger>
        <TabsTrigger value="zoom">Jadwal Zoom</TabsTrigger>
      </TabsList>
      <TabsContent value="schedule" className="mt-6">
        <ScheduleView meetings={meetings} />
      </TabsContent>
      <TabsContent value="zoom" className="mt-6">
        <ZoomCalendar />
      </TabsContent>
    </Tabs>
  );
}
