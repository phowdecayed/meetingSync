import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getMeetings,
  getMeetingById,
  createMeeting,
  deleteMeeting,
} from '@/lib/data'
import prisma from '@/lib/prisma' // Impor prisma

// GET /api/meetings - Mengambil semua pertemuan
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 },
      )
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id) {
      const meeting = await getMeetingById(id)
      if (!meeting) {
        return NextResponse.json(
          { error: 'Meeting not found' },
          { status: 404 },
        )
      }
      return NextResponse.json(meeting)
    }

    const meetings = await getMeetings()
    return NextResponse.json(meetings)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 },
    )
  }
}

// POST /api/meetings - Membuat pertemuan baru
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 },
      )
    }

    // Verifikasi bahwa pengguna ada di database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not found' },
        { status: 401 },
      )
    }

    const data = await request.json()

    if (!data.title || !data.date || data.duration === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    // Make sure organizerId is set to the current user's ID
    const meetingData = {
      ...data,
      organizerId: user.id, // Gunakan user.id yang sudah terverifikasi
    }

    const meeting = await createMeeting(meetingData)

    return NextResponse.json(meeting)
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    console.error('Error creating meeting:', errorMessage)
    return NextResponse.json(
      { error: errorMessage || 'Failed to create meeting' },
      { status: 500 },
    )
  }
}

// DELETE /api/meetings - Menghapus pertemuan
export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 },
      )
    }

    // Verify if user has permission to delete this meeting (admin or owner)
    // This would be handled inside deleteMeeting in a real app

    const result = await deleteMeeting(id)

    return NextResponse.json(result)
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    console.error('Error deleting meeting:', errorMessage)
    return NextResponse.json(
      { error: errorMessage || 'Failed to delete meeting' },
      { status: 500 },
    )
  }
}
