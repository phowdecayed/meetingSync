"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ZoomCalendar } from "@/components/zoom-calendar";

type MeetingsViewTabsProps = object;

export function MeetingsViewTabs({}: MeetingsViewTabsProps) {
  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Zoom Meeting Calendar</CardTitle>
          <CardDescription>
            Currently showing only Zoom meetings. Internal scheduling is
            temporarily disabled.
          </CardDescription>
        </CardHeader>
      </Card>
      <ZoomCalendar />
    </div>
  );
}
