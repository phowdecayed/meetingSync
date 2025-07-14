import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMeetings } from "@/lib/data";

// This type is a simplified version of what the ZoomCalendar component expects.
type CalendarMeeting = {
  id: number; // Zoom Meeting ID
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password?: string;
  description?: string;
  isOwner: boolean;
};

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // getMeetings fetches from the local DB and correctly filters by organizer and participant.
    const localMeetings = await getMeetings(user);

    // Transform the database `Meeting` type into the `CalendarMeeting` type
    // that the frontend component expects.
    const calendarMeetings: CalendarMeeting[] = localMeetings
      .map((m) => {
        // If there's no zoomMeetingId, we can't display it on the Zoom calendar.
        if (!m.zoomMeetingId || !m.zoomJoinUrl) {
          return null;
        }

        return {
          id: parseInt(m.zoomMeetingId, 10),
          topic: m.title,
          start_time: m.date.toISOString(),
          duration: m.duration,
          join_url: m.zoomJoinUrl,
          password: m.zoomPassword,
          description: m.description,
          isOwner: m.organizerId === user.id,
        };
      })
      .filter((m): m is CalendarMeeting => m !== null); // Filter out any nulls

    return NextResponse.json({
      meetings: calendarMeetings,
      nextPageToken: undefined, // Pagination is not handled in this simplified API.
    });
  } catch (error) {
    console.error("Error fetching meetings for calendar:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: `Failed to fetch meetings: ${errorMessage}` },
      { status: 500 },
    );
  }
}