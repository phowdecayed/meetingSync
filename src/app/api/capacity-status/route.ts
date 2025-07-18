import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Get Zoom accounts
    const accounts = await prisma.zoomCredentials.findMany({
      where: { deletedAt: null },
    })

    // Get current meetings (simplified load calculation)
    const currentMeetings = await prisma.meeting.findMany({
      where: {
        deletedAt: null,
        isZoomMeeting: true,
        zoomCredentialId: { not: null },
        date: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          lte: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        },
      },
    })

    const totalCapacity = accounts.length * 2 // 2 meetings per account
    const currentUsage = currentMeetings.length
    const availableSlots = Math.max(0, totalCapacity - currentUsage)
    const utilizationPercentage =
      totalCapacity > 0 ? (currentUsage / totalCapacity) * 100 : 0

    return NextResponse.json({
      totalAccounts: accounts.length,
      totalCapacity,
      currentUsage,
      availableSlots,
      utilizationPercentage,
    })
  } catch (error) {
    console.error('Error getting capacity status:', error)

    return NextResponse.json({
      totalAccounts: 0,
      totalCapacity: 0,
      currentUsage: 0,
      availableSlots: 0,
      utilizationPercentage: 0,
    })
  }
}

export async function POST() {
  try {
    // Force refresh - just return updated data
    return GET()
  } catch (error) {
    console.error('Error forcing capacity refresh:', error)

    return NextResponse.json(
      {
        error: 'Failed to refresh capacity status',
      },
      { status: 500 },
    )
  }
}
