import { NextRequest, NextResponse } from 'next/server'
import { zoomAccountService } from '@/services/zoom-account-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const startTimeStr = searchParams.get('startTime')
    const endTimeStr = searchParams.get('endTime')
    const excludeMeetingId = searchParams.get('excludeMeetingId')

    if (!accountId || !startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { error: 'accountId, startTime, and endTime are required' },
        { status: 400 }
      )
    }

    const startTime = new Date(startTimeStr)
    const endTime = new Date(endTimeStr)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const count = await zoomAccountService.countConcurrentMeetings(
      accountId,
      startTime,
      endTime,
      excludeMeetingId || undefined
    )

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error counting concurrent meetings:', error)
    return NextResponse.json({ count: 0 })
  }
}