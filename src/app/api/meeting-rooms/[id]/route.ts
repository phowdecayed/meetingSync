import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateMeetingRoom, deleteMeetingRoom } from '@/lib/data'
import { z } from 'zod'

const roomSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  capacity: z.coerce
    .number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .optional(),
  location: z.string().min(1, 'Location is required').optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const json = await request.json()
    const data = roomSchema.parse(json)

    const updatedRoom = await updateMeetingRoom(id, data)
    return NextResponse.json(updatedRoom)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to update meeting room' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await deleteMeetingRoom(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete meeting room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
