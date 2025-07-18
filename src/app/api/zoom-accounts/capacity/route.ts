import { NextRequest, NextResponse } from 'next/server'
import { zoomAccountService } from '@/services/zoom-account-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startTimeStr = searchParams.get('startTime')
    const endTimeStr = searchParams.get('endTime')
    const excludeMeetingId = searchParams.get('excludeMeetingId')

    if (!startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 },
      )
    }

    const startTime = new Date(startTimeStr)
    const endTime = new Date(endTimeStr)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 },
      )
    }

    const capacityResult =
      await zoomAccountService.checkConcurrentMeetingCapacity(
        startTime,
        endTime,
        excludeMeetingId || undefined,
      )

    return NextResponse.json(capacityResult)
  } catch (error) {
    console.error('Error checking Zoom capacity:', error)

    // Return safe default for graceful degradation
    return NextResponse.json({
      hasAvailableAccount: false,
      totalAccounts: 0,
      totalMaxConcurrent: 0,
      currentTotalUsage: 0,
      availableSlots: 0,
      conflictingMeetings: [],
    })
  }
}
