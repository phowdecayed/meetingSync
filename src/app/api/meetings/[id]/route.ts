// src/app/api/meetings/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { deleteMeeting, getMeetingById } from '@/lib/data';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const routeContextSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

/**
 * @description Menghapus meeting berdasarkan ID
 * @param req NextRequest
 * @param context RouteContext
 * @returns NextResponse
 */
export async function DELETE(
  req: NextRequest,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context);
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const meetingId = params.id;

    // Ambil detail rapat sebelum menghapusnya untuk mendapatkan zoom_meeting_id
    const meeting = await getMeetingById(meetingId);
    if (!meeting) {
      return new NextResponse('Meeting not found', { status: 404 });
    }

    // Hapus rapat dari database dan Zoom
    const deleteResult = await deleteMeeting(meetingId);

    if (!deleteResult.success) {
      return new NextResponse('Failed to delete meeting', { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }

    console.error('Failed to delete meeting:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}