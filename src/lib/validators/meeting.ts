import * as z from 'zod';

export const meetingSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long." }),
  date: z.date({ required_error: "A date is required." }),
  time: z.string({ required_error: "A time is required." }).regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  duration: z.coerce.number().min(5, { message: "Duration must be at least 5 minutes." }),
  participants: z.string().refine(val => {
    if (!val.trim()) return true; // Optional field if empty
    return val.split(',').every(email => z.string().email().safeParse(email.trim()).success);
  }, { message: "Please provide a comma-separated list of valid email addresses." }),
  description: z.string().optional(),
});
