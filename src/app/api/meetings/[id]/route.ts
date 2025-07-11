import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMeetingById, updateMeeting } from "@/lib/data";
import { getZoomMeetingSummary } from "@/lib/zoom";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in" },
        { status: 401 },
      );
    }

    const meetingId = params.id;
    if (!meetingId) {
      return NextResponse.json(
        { error: "Meeting ID is required" },
        { status: 400 },
      );
    }

    const data = await request.json();

    // Verify that the user is the organizer of the meeting
    const meeting = await getMeetingById(meetingId);
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized: You can only edit your own meetings" },
        { status: 403 },
      );
    }

    const updatedMeeting = await updateMeeting(meetingId, data);
    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error("Error updating meeting:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update meeting" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!request.url.endsWith("/meeting_summary")) {
    return new Response(null, { status: 404 });
  }

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in" },
        { status: 401 },
      );
    }

    const meetingId = params.id;
    if (!meetingId) {
      return NextResponse.json(
        { error: "Meeting ID is required" },
        { status: 400 },
      );
    }

    // First get our meeting to get the Zoom meeting ID
    const meeting = await getMeetingById(meetingId);
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check if meeting has a Zoom meeting ID
    if (!meeting.zoomMeetingId) {
      return NextResponse.json(
        { error: "No Zoom meeting associated with this meeting" },
        { status: 404 },
      );
    }

    // Get the meeting summary from Zoom API
    const summary = await getZoomMeetingSummary(meeting.zoomMeetingId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching meeting summary:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch meeting summary" },
      { status: 500 },
    );
  }
}
