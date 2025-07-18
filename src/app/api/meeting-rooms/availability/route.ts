import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { roomAvailabilityService } from '@/services/room-availability-service'
import { z } from 'zod'

const availabilitySchema = z.object({
  roomId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  excludeMeetingId: z.string().optional()
})

const findRoomsSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  participantCount: z.number().optional(),
  preferredLocation: z.string().optional()
})

// GET /api/meeting-rooms/availability - Check room availability
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const roomId = url.searchParams.get('roomId')
    const startTime = url.searchParams.get('startTime')
    const endTime = url.searchParams.get('endTime')
    const excludeMeetingId = url.searchParams.get('excludeMeetingId')

    if (!roomId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required parameters: roomId, startTime, endTime' },
        { status: 400 }
      )
    }

    const result = await roomAvailabilityService.checkRoomAvailability(
      roomId,
      new Date(startTime),
      new Date(endTime),
      excludeMeetingId || undefined
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error checking room availability:', error)
    return NextResponse.json(
      { error: 'Failed to check room availability' },
      { status: 500 }
    )
  }
}

// POST /api/meeting-rooms/availability - Find available rooms or check specific room
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const action = body.action

    if (action === 'check') {
      // Check specific room availability
      const { roomId, startTime, endTime, excludeMeetingId } = availabilitySchema.parse(body)
      
      const result = await roomAvailabilityService.checkRoomAvailability(
        roomId,
        new Date(startTime),
        new Date(endTime),
        excludeMeetingId
      )

      return NextResponse.json(result)
    } else if (action === 'find') {
      // Find available rooms
      const { startTime, endTime, participantCount, preferredLocation } = findRoomsSchema.parse(body)
      
      if (participantCount && preferredLocation) {
        const optimalRooms = await roomAvailabilityService.findOptimalRooms(
          new Date(startTime),
          new Date(endTime),
          participantCount,
          preferredLocation
        )
        return NextResponse.json(optimalRooms)
      } else {
        const availableRooms = await roomAvailabilityService.findAvailableRooms(
          new Date(startTime),
          new Date(endTime)
        )
        return NextResponse.json(availableRooms)
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "check" or "find"' },
        { status: 400 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error in room availability API:', error)
    return NextResponse.json(
      { error: 'Failed to process room availability request' },
      { status: 500 }
    )
  }
}