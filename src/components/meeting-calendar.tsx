"use client";

import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { type Meeting } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  User,
  Link as LinkIcon,
  Info,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "./ui/badge";

type MeetingCalendarProps = {
  meetings: Meeting[];
};

export function MeetingCalendar({ meetings }: MeetingCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  const meetingsByDay = meetings.reduce(
    (acc, meeting) => {
      const day = format(new Date(meeting.date), "yyyy-MM-dd");
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(meeting);
      return acc;
    },
    {} as Record<string, Meeting[]>,
  );

  const daysWithMeetings = Object.keys(meetingsByDay).map((dayStr) => {
    const [year, month, day] = dayStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  });

  const selectedDayMeetings = selectedDay
    ? meetings.filter((m) => isSameDay(new Date(m.date), selectedDay))
    : [];

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                modifiers={{ hasMeeting: daysWithMeetings }}
                modifiersClassNames={{ hasMeeting: "rdp-day_has-meeting" }}
                className="border rounded-lg p-2"
              />
            </div>
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">
                Meetings on {selectedDay ? format(selectedDay, "PPP") : "..."}
              </h3>
              <div className="space-y-4 h-[300px] lg:h-[450px] overflow-y-auto pr-2">
                {selectedDayMeetings.length > 0 ? (
                  selectedDayMeetings
                    .sort(
                      (a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime(),
                    )
                    .map((meeting) => {
                      const zoomLink =
                        meeting.zoomJoinUrl ||
                        (meeting.zoomMeetingId
                          ? `https://zoom.us/j/${meeting.zoomMeetingId}`
                          : null);
                      return (
                        <Card key={meeting.id} className="flex flex-col">
                          <CardHeader className="py-4">
                            <CardTitle className="text-lg">
                              {meeting.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-0">
                            <div className="flex items-start gap-4">
                              <CalendarIcon className="h-5 w-5 mt-1 text-muted-foreground" />
                              <div>
                                <h4 className="font-semibold text-sm">
                                  Date & Time
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(meeting.date), "PPPP p")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <Clock className="h-5 w-5 mt-1 text-muted-foreground" />
                              <div>
                                <h4 className="font-semibold text-sm">
                                  Duration
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {meeting.duration} minutes
                                </p>
                              </div>
                            </div>
                            {meeting.description && (
                              <div className="flex items-start gap-4">
                                <Info className="h-5 w-5 mt-1 text-muted-foreground" />
                                <div>
                                  <h4 className="font-semibold text-sm">
                                    Description
                                  </h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {meeting.description}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-4">
                              <Users className="h-5 w-5 mt-1 text-muted-foreground" />
                              <div>
                                <h4 className="font-semibold text-sm">
                                  Participants
                                </h4>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {meeting.participants.length > 0 ? (
                                    meeting.participants.map((p) => (
                                      <Badge key={p} variant="secondary">
                                        {p}
                                      </Badge>
                                    ))
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      No participants other than the organizer.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <LinkIcon className="h-5 w-5 mt-1 text-muted-foreground" />
                              <div>
                                <h4 className="font-semibold text-sm">
                                  Zoom Meeting Link
                                </h4>
                                {zoomLink ? (
                                  <a
                                    href={zoomLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline break-all"
                                  >
                                    Join Zoom Meeting
                                  </a>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No Zoom link available
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground pt-4">
                      No meetings scheduled for this day.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
