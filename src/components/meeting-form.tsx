"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { meetingSchema } from "@/lib/validators/meeting";
import { Meeting, User } from "@/lib/data";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useMeetingStore } from "@/store/use-meeting-store";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { UserCombobox } from "./user-combobox";
import { format } from "date-fns";

type MeetingFormProps = {
  allUsers: User[];
  existingMeeting?: Meeting;
};

export function MeetingForm({ existingMeeting, allUsers }: MeetingFormProps) {
  const router = useRouter();
  const { toast, dismiss } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { addMeeting, updateMeeting } = useMeetingStore();
  const { data: session } = useSession();
  const user = session?.user;

  const isEditMode = !!existingMeeting;

  const defaultValues = isEditMode && existingMeeting ? {
      title: existingMeeting.title,
      date: new Date(existingMeeting.date),
      time: format(new Date(existingMeeting.date), "HH:mm"),
      duration: existingMeeting.duration,
      participants: existingMeeting.participants,
      description: existingMeeting.description || "",
      password: existingMeeting.zoomPassword || "",
  } : {
      title: "",
      date: new Date(),
      time: format(new Date(), "HH:mm"),
      duration: 30,
      participants: [],
      description: "",
      password: "",
  };

  const form = useForm<z.infer<typeof meetingSchema>>({
    resolver: zodResolver(meetingSchema),
    defaultValues,
  });

  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const overlapToastShown = useRef(false);

  // Fetch all meetings for overlap check (except when editing, exclude current meeting)
  useEffect(() => {
    async function fetchMeetings() {
      try {
        const res = await fetch('/api/meetings');
        const data = await res.json();
        setAllMeetings(isEditMode && existingMeeting ? data.filter((m: Meeting) => m.id !== existingMeeting.id) : data);
      } catch (e) {
        // ignore
      }
    }
    fetchMeetings();
  }, [isEditMode, existingMeeting]);

  // Check for overlap whenever date, time, or duration changes
  useEffect(() => {
    const values = form.getValues();
    if (!values.date || !values.time || !values.duration) {
      setOverlapError(null);
      if (overlapToastShown.current) {
        overlapToastShown.current = false;
        dismiss();
      }
      return;
    }
    const [hours, minutes] = values.time.split(':').map(Number);
    const newStart = new Date(values.date);
    newStart.setHours(hours, minutes, 0, 0);
    const newEnd = new Date(newStart.getTime() + values.duration * 60 * 1000);
    const startOfDay = new Date(newStart);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(newStart);
    endOfDay.setHours(23, 59, 59, 999);
    const meetingsOnDay = allMeetings.filter(m => {
      const d = new Date(m.date);
      return d >= startOfDay && d <= endOfDay;
    });
    const isOverlap = meetingsOnDay.some((m) => {
      const existingStart = new Date(m.date);
      const existingEnd = new Date(existingStart.getTime() + m.duration * 60 * 1000);
      return newStart < existingEnd && newEnd > existingStart;
    });
    if (isOverlap) {
      setOverlapError('There is already a meeting scheduled during this timeslot.');
      if (!overlapToastShown.current) {
        toast({
          variant: "destructive",
          title: "Double Booking Detected",
          description: "There is already a meeting scheduled during this timeslot.",
          duration: 5000,
        });
        overlapToastShown.current = true;
      }
    } else {
      setOverlapError(null);
      if (overlapToastShown.current) {
        dismiss();
        overlapToastShown.current = false;
      }
    }
  }, [form.watch('date'), form.watch('time'), form.watch('duration'), allMeetings]);

  async function onSubmit(values: z.infer<typeof meetingSchema>) {
    setIsLoading(true);

    if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
        setIsLoading(false);
        return;
    }

    const [hours, minutes] = values.time.split(':').map(Number);
    const combinedDateTime = new Date(values.date);
    combinedDateTime.setHours(hours, minutes, 0, 0);

    const meetingData = {
        title: values.title,
        date: combinedDateTime,
        duration: values.duration,
        participants: values.participants,
        description: values.description,
        password: values.password,
        organizerId: user.id
    };

    try {
        if (isEditMode && existingMeeting) {
            await updateMeeting(existingMeeting.id, meetingData);
            toast({ title: "Success", description: "Meeting updated successfully." });
        } else {
            const newMeeting = await addMeeting(meetingData);
            toast({ 
                title: "Success",
                description: "Meeting created successfully."
            });
        }
        router.push('/dashboard');
        router.refresh();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Something went wrong." });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>{isEditMode ? "Edit Meeting" : "Create New Meeting"}</CardTitle>
                    <CardDescription>
                        {isEditMode ? "Update the details for your meeting." : "Fill in the details to schedule your next meeting."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meeting Title</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Quarterly Review" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Date</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? (
                                        format(field.value, "PPP")
                                        ) : (
                                        <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                                    initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="time"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Time (24h format)</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="duration"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Duration (in minutes)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="30" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Zoom Meeting Password</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="Enter password for Zoom meeting" 
                                        {...field} 
                                        value={field.value || ""}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Password for participants to join the Zoom meeting
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="participants"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Participants</FormLabel>
                            <FormControl>
                                <UserCombobox 
                                    allUsers={allUsers.filter(u => u.email !== user?.email)}
                                    selectedUsers={field.value ?? []}
                                    onChange={field.onChange}
                                />
                            </FormControl>
                            <FormDescription>
                                Select users to invite to the meeting.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                            <Textarea placeholder="Agenda, notes, and links..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
                <CardFooter className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isLoading || !!overlapError}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? "Save Changes" : "Create Meeting"}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </Form>
  );
}
