import { NextRequest, NextResponse } from 'next/server'
import { enhancedConflictDetection } from '@/services/enhanced-conflict-detection'
import {
  MeetingFormData,
  ConflictType,
  ConflictSeverity,
} from '@/types/conflict-detection'

export async function POST(request: NextRequest) {
  try {
    const meetingData: MeetingFormData = await request.json()

    // Convert date string to Date object
    if (meetingData.date) {
      meetingData.date = new Date(meetingData.date)
    }

    // Validate the meeting using the server-side service
    const result = await enhancedConflictDetection.validateMeeting(meetingData)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error validating meeting:', error)

    return NextResponse.json({
      conflicts: [
        {
          type: ConflictType.INVALID_TYPE,
          severity: ConflictSeverity.WARNING,
          message: 'Unable to validate meeting at this time. Please try again.',
        },
      ],
      suggestions: [],
      canSubmit: true, // Allow submission when validation fails
    })
  }
}
