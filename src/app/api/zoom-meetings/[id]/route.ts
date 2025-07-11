import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteZoomMeeting } from "@/lib/zoom";

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: zoomMeetingId } = context.params;

    if (!zoomMeetingId) {
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 },
      );
    }

    const meeting = await prisma.meeting.findFirst({
      where: { zoomMeetingId },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const isOrganizer = meeting.organizerId === session.user.id;
    const participants = meeting.participants
      ? meeting.participants.split(",").map((p) => p.trim())
      : [];

    return NextResponse.json({
      id: zoomMeetingId,
      topic: meeting.title,
      description: meeting.description,
      start_time: meeting.date,
      duration: meeting.duration,
      join_url: meeting.zoomJoinUrl,
      password: meeting.zoomPassword,
      organizer: meeting.organizer,
      isOrganizer,
      participants,
    });
  } catch (error) {
    console.error("Error fetching meeting details:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting details" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: zoomMeetingId } = context.params;

    if (!zoomMeetingId) {
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 },
      );
    }

    const meeting = await prisma.meeting.findFirst({
      where: { zoomMeetingId },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found in database" },
        { status: 404 },
      );
    }

    // Authorization check: allow if user is the organizer OR if the user is an admin
    const isOrganizer = meeting.organizerId === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isOrganizer && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to delete this meeting." },
        { status: 403 },
      );
    }

    // Step 1: Delete from Zoom
    try {
      await deleteZoomMeeting(zoomMeetingId);
    } catch (zoomError: any) {
      if (zoomError.response?.status !== 404) {
        console.error("Error deleting from Zoom:", zoomError);
        // Do not throw error, just log it, so we can still delete from our DB
      }
    }

    // Step 2: Delete from our database
    await prisma.meeting.delete({
      where: { id: meeting.id },
    });

    return NextResponse.json(
      { message: "Meeting deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 },
    );
  }
}
