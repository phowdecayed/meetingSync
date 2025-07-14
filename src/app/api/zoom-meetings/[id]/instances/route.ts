import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getZoomApiClient } from "@/lib/zoom";

/**
 * GET endpoint to retrieve all instances (occurrences) of a Zoom meeting
 *
 * @param request Request object
 * @param context Context containing meeting ID params
 * @returns JSON response with meeting instances or error
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Correctly await params before accessing the id property
    const { id: meetingId } = await context.params;
    if (!meetingId) {
      return NextResponse.json(
        { error: "Missing meeting ID" },
        { status: 400 },
      );
    }

    // Get Zoom API client
    const zoomClient = await getZoomApiClient();

    // Call Zoom API to get meeting instances
    const response = await zoomClient.get(
      `/past_meetings/${meetingId}/instances`,
    );
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Failed to fetch meeting instances:", errorMessage);
    return NextResponse.json(
      {
        error: "Failed to fetch meeting instances",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
