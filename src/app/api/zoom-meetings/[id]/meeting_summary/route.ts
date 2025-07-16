import { NextResponse } from 'next/server'
import { getZoomMeetingSummary } from '@/lib/zoom'
import { z } from 'zod'

const routeContextSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

export async function GET(
  req: Request,
  context: z.infer<typeof routeContextSchema>,
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const meetingId = params.id

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 },
      )
    }

    const summaries = await getZoomMeetingSummary(meetingId)

    if (summaries.length === 0) {
      return NextResponse.json(
        {
          message:
            'No past meeting instances with summaries found for this ID.',
        },
        { status: 404 },
      )
    }

    // If there's only one summary, return it directly
    if (summaries.length === 1) {
      return NextResponse.json(summaries[0])
    }

    // If there are multiple, create a combined summary object
    const combinedContent = summaries
      .map((summary, index) => {
        const startTime = new Date(summary.meeting_start_time).toLocaleString(
          'id-ID',
          { timeZone: 'Asia/Jakarta' },
        )
        return `--- Ringkasan Rapat ${
          index + 1
        } (Mulai: ${startTime}) ---\n\nJudul: ${
          summary.summary_title
        }\n\n${summary.summary_content}`
      })
      .join('\n\n==================================================\n\n')

    const combinedSummary = {
      ...summaries[0], // Use the first summary as a base for metadata
      meeting_uuid: summaries.map((s) => s.meeting_uuid).join(', '), // Combine UUIDs
      summary_title: `Ringkasan Gabungan untuk "${summaries[0].meeting_topic}"`,
      summary_content: combinedContent,
      is_combined_summary: true,
      original_summaries: summaries,
    }

    return NextResponse.json(combinedSummary)
  } catch (error) {
    console.error('API Error getting meeting summary:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    if (error instanceof Error) {
      if (error.message.includes('Could not find associated credentials')) {
        return NextResponse.json(
          {
            error: 'Could not find credentials for this meeting.',
            details: error.message,
          },
          { status: 404 },
        )
      }
      if (error.message.includes('Failed to get Zoom meeting summary')) {
        return NextResponse.json(
          {
            error: 'Failed to retrieve the meeting summary from Zoom.',
            details: error.message,
          },
          { status: 502 },
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
