import * as z from 'zod'

export const meetingSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters long.' }),
  date: z.date().min(new Date(), { message: 'A date is required.' }),
  time: z
    .string()
    .min(1, { message: 'A time is required.' })
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  duration: z.coerce
    .number()
    .min(5, { message: 'Duration must be at least 5 minutes.' }),
  participants: z
    .array(
      z.string().email({ message: 'Each participant must be a valid email.' }),
    )
    .default([]),
  description: z.string().optional(),
  zoomPassword: z
    .string()
    .min(1, { message: 'Password is required for Zoom meetings.' })
    .max(10, { message: 'Password cannot be longer than 10 characters.' })
    .optional(),
  meetingType: z.enum(['internal', 'external']).default('internal'),
  isZoomMeeting: z.boolean().default(true),
  meetingRoomId: z.string().optional().nullable(),
})
