'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeetingCalendar } from '@/components/meeting-calendar';
import { MeetingsTable } from '@/components/meetings-table';
import { type Meeting } from '@/lib/data';

export function MeetingsViewTabs({ meetings }: { meetings: Meeting[] }) {
    return (
        <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
                <MeetingsTable initialMeetings={meetings} />
            </TabsContent>
            <TabsContent value="calendar">
                <MeetingCalendar meetings={meetings} />
            </TabsContent>
        </Tabs>
    );
}
