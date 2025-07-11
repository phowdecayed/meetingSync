"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingCalendar } from "@/components/meeting-calendar";
import { type Meeting } from "@/lib/data";
import { format } from "date-fns";
import { Clock, User, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { MeetingDetailsDialog } from "./meeting-details-dialog";
import { Button } from "./ui/button";

const LOCAL_STORAGE_KEY = "schedule-view-mode";

export function ScheduleView({ meetings }: { meetings: Meeting[] }) {
  const [meetingToView, setMeetingToView] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedValue === "list" || storedValue === "calendar") {
      setActiveTab(storedValue);
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem(LOCAL_STORAGE_KEY, value);
  };

  // Group meetings by date for list view
  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.date) >= new Date(),
  );
  const groupedByDate = upcomingMeetings.reduce(
    (acc, meeting) => {
      const dateKey = format(new Date(meeting.date), "PPPP"); // e.g., "Saturday, August 24th, 2024"
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(meeting);
      return acc;
    },
    {} as Record<string, Meeting[]>,
  );

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  const ListView = () => {
    if (upcomingMeetings.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            You have no upcoming meetings scheduled.
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-6">
        {sortedDates.map((date) => (
          <div key={date}>
            <h2 className="text-xl font-semibold mb-4">{date}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupedByDate[date].map((meeting) => (
                <Card key={meeting.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-grow">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      <span>
                        {format(new Date(meeting.date), "p")} (
                        {meeting.duration} min)
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="mr-2 h-4 w-4" />
                      <span className="truncate">
                        {meeting.participants.join(", ")}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setMeetingToView(meeting)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <ListView />
        </TabsContent>
        <TabsContent value="calendar">
          {meetings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                You have no meetings to show in the calendar.
              </CardContent>
            </Card>
          ) : (
            <MeetingCalendar meetings={meetings} />
          )}
        </TabsContent>
      </Tabs>
      <MeetingDetailsDialog
        isOpen={!!meetingToView}
        onClose={() => setMeetingToView(null)}
        meeting={meetingToView}
      />
    </>
  );
}
