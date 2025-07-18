import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMeetingRooms, createMeetingRoom } from '@/lib/data'
import { z } from 'zod'

const roomSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  location: z.string().min(1, 'Location is required'),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rooms = await getMeetingRooms()
    return NextResponse.json(rooms)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch meeting rooms' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const json = await request.json()
    const data = roomSchema.parse(json)

    const newRoom = await createMeetingRoom(data)
    return NextResponse.json(newRoom, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create meeting room' },
      { status: 500 },
    )
  }
}
