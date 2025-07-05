'use client';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeetingCalendar } from '@/components/meeting-calendar';
import { MeetingsTable } from '@/components/meetings-table';
import { type Meeting } from '@/lib/data';

const LOCAL_STORAGE_KEY = 'meetings-view-mode';

export function MeetingsViewTabs({ meetings }: { meetings: Meeting[] }) {
    const [activeTab, setActiveTab] = useState('list');

    useEffect(() => {
        const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedValue === 'list' || storedValue === 'calendar') {
            setActiveTab(storedValue);
        }
    }, []);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        localStorage.setItem(LOCAL_STORAGE_KEY, value);
    };

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
