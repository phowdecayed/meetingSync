'use client'

import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { meetingSchema } from '@/lib/validators/meeting'
import { Meeting, User, MeetingRoom } from '@/lib/data'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useMeetingStore } from '@/store/use-meeting-store'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card'
import { UserCombobox } from './user-combobox'
import { DurationPresets } from './duration-presets'
import { ConflictIndicator } from './conflict-indicator'
import { format } from 'date-fns'
import { enhancedConflictDetectionClient } from '@/services/enhanced-conflict-detection-client'
import { MeetingType, MeetingFormData, ConflictInfo } from '@/types/conflict-detection'

type MeetingFormProps = {
  allUsers: User[]
  existingMeeting?: Meeting
}

export function MeetingForm({ existingMeeting, allUsers }: MeetingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const { addMeeting, updateMeeting } = useMeetingStore()
  const { data: session } = useSession()
  const user = session?.user
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([])

  useEffect(() => {
    async function fetchMeetingRooms() {
      try {
        const res = await fetch('/api/meeting-rooms')
        const data = await res.json()
        setMeetingRooms(data)
      } catch {
        // ignore
      }
    }
    fetchMeetingRooms()
  }, [])

  const isEditMode = !!existingMeeting

  const defaultValues =
    isEditMode && existingMeeting
      ? {
        title: existingMeeting.title,
        date: new Date(existingMeeting.date),
        time: format(new Date(existingMeeting.date), 'HH:mm'),
        duration: existingMeeting.duration,
        participants: Array.isArray(existingMeeting.participants)
          ? existingMeeting.participants
          : typeof existingMeeting.participants === 'string'
            ? (existingMeeting.participants as string)
              .split(',')
              .map((p: string) => p.trim())
            : [],
        description: existingMeeting.description || '',
        zoomPassword: existingMeeting.zoomPassword || 'BPKADJabar',
        meetingType: existingMeeting.meetingType || 'internal',
        isZoomMeeting: existingMeeting.isZoomMeeting,
        meetingRoomId: existingMeeting.meetingRoomId,
      }
      : {
        title: '',
        date: new Date(),
        time: format(new Date(), 'HH:mm'),
        duration: 30,
        participants: [],
        description: '',
        zoomPassword: 'BPKADJabar',
        meetingType: 'internal',
        isZoomMeeting: true,
        meetingRoomId: null,
      }

  const form = useForm<z.infer<typeof meetingSchema>>({
    resolver: zodResolver(meetingSchema) as Resolver<
      z.infer<typeof meetingSchema>
    >,
    defaultValues: {
      ...defaultValues,
      meetingType: defaultValues.meetingType as 'internal' | 'external',
    },
  })

  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [isConflictAnimating, setIsConflictAnimating] = useState(false)

  const watchedDate = form.watch('date')
  const watchedTime = form.watch('time')
  const watchedDuration = form.watch('duration')
  const isZoomMeeting = form.watch('isZoomMeeting')
  const watchedTitle = form.watch('title')
  const watchedParticipants = form.watch('participants')
  const watchedMeetingType = form.watch('meetingType')
  const watchedMeetingRoomId = form.watch('meetingRoomId')

  // Check completion status for each section
  const isCoreDetailsComplete = !!(watchedTitle && watchedDate && watchedTime && watchedDuration)
  const isTypeParticipantsComplete = !!(watchedMeetingType && watchedParticipants?.length > 0)
  const isLocationDetailsComplete = true // Optional section, always considered complete

  // Enhanced conflict detection using the new service
  useEffect(() => {
    if (!watchedDate || !watchedTime || !watchedDuration || !watchedTitle) {
      setConflicts([])
      return
    }

    const validateMeetingData = async () => {
      try {
        const [hours, minutes] = watchedTime.split(':').map(Number)
        if (isNaN(hours) || isNaN(minutes)) {
          setConflicts([])
          return
        }

        // Determine the correct meeting type based on form state
        let determinedMeetingType: MeetingType
        if (isZoomMeeting) {
          determinedMeetingType = watchedMeetingRoomId ? MeetingType.HYBRID : MeetingType.ONLINE
        } else {
          determinedMeetingType = MeetingType.OFFLINE
        }

        // Map form data to MeetingFormData interface
        const meetingFormData: MeetingFormData = {
          title: watchedTitle,
          date: watchedDate,
          time: watchedTime,
          duration: watchedDuration,
          meetingType: determinedMeetingType,
          isZoomMeeting: isZoomMeeting,
          meetingRoomId: watchedMeetingRoomId || undefined,
          participants: watchedParticipants || [],
          description: form.getValues('description') || undefined,
          zoomPassword: form.getValues('zoomPassword') || undefined
        }

        // Use enhanced conflict detection service
        const conflictResult = await enhancedConflictDetectionClient.validateMeeting(meetingFormData)
        
        // Only update conflicts if they've actually changed
        const conflictsChanged = conflictResult.conflicts.length !== conflicts.length || 
          JSON.stringify(conflictResult.conflicts) !== JSON.stringify(conflicts)
        
        if (conflictsChanged) {
          setIsConflictAnimating(true)
          setTimeout(() => setIsConflictAnimating(false), 300)
          setConflicts(conflictResult.conflicts)
        }
      } catch (error) {
        console.error('Error in enhanced conflict detection:', error)
        setConflicts([])
      }
    }

    // Debounce the validation to avoid too many API calls
    const timeoutId = setTimeout(validateMeetingData, 500)
    return () => clearTimeout(timeoutId)
  }, [
    watchedDate, 
    watchedTime, 
    watchedDuration, 
    watchedTitle,
    isZoomMeeting,
    watchedMeetingRoomId,
    watchedParticipants,
    form
  ])

  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion: string) => {
    const timeMatch = suggestion.match(/(\d{2}:\d{2})/)
    if (timeMatch) {
      const suggestedTime = timeMatch[1]
      form.setValue('time', suggestedTime)
      // Trigger validation to update conflicts
      form.trigger('time')
    }
  }

  // Check if there are blocking conflicts
  const hasBlockingConflicts = conflicts.some(c => c.severity === 'error')

  async function onSubmit(values: z.infer<typeof meetingSchema>) {
    setIsLoading(true)

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in.',
      })
      setIsLoading(false)
      return
    }

    const localDate = new Date(values.date)
    const combinedDateTime = new Date(
      `${localDate.getFullYear()}-${(localDate.getMonth() + 1).toString().padStart(2, '0')}-${localDate.getDate().toString().padStart(2, '0')}T${values.time}:00`,
    )

    const meetingData = {
      ...values,
      date: combinedDateTime,
      organizerId: user.id,
      participants: values.participants.join(', '),
    }

    try {
      if (isEditMode && existingMeeting) {
        await updateMeeting(existingMeeting.id, meetingData)
        toast({
          title: 'Success',
          description: 'Meeting updated successfully.',
        })
      } else {
        await addMeeting({
          ...meetingData,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          isZoomMeeting: meetingData.isZoomMeeting,
          zoomMeetingId: null,
          zoomJoinUrl: null,
          zoomStartUrl: null,
          zoomPassword: meetingData.zoomPassword || null,
          organizerId: user.id,
          zoomCredentialId: null,
          meetingRoomId: meetingData.meetingRoomId ?? null,
          description: meetingData.description || null, // Ensure description is string | null
        })
        toast({
          title: 'Success',
          description: 'Meeting created successfully.',
        })
      }
      router.push('/schedule')
      router.refresh()
    } catch (error) {
      let errorMessage = 'Something went wrong.'
      if (error instanceof Error) {
        errorMessage = error.message.startsWith('CAPACITY_FULL:')
          ? error.message.replace('CAPACITY_FULL:', '')
          : error.message
      }
      toast({
        variant: 'destructive',
        title: 'Error Creating Meeting',
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="enhanced-meeting-form">
        <Card className="mx-auto max-w-4xl border-0 shadow-none md:border md:shadow-sm transition-all duration-300 hover:shadow-md">
          <CardHeader className="space-y-4 pb-8">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight leading-tight">
                {isEditMode ? 'Edit Meeting' : 'Create New Meeting'}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed text-muted-foreground">
                {isEditMode
                  ? 'Update the details for your meeting.'
                  : 'Fill in the details to schedule your next meeting.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <Accordion
              type="multiple"
              defaultValue={['item-1', 'item-2']}
              className="w-full space-y-6"
            >
              <AccordionItem value="item-1" isCompleted={isCoreDetailsComplete}>
                <AccordionTrigger isCompleted={isCoreDetailsComplete}>
                  <h3 className="text-lg font-medium">Core Details</h3>
                </AccordionTrigger>
                <AccordionContent className="space-y-8 pt-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Meeting Title
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Quarterly Review"
                            className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3 md:gap-8 mt-8">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-3">
                          <FormLabel className="text-sm font-medium leading-none">Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'h-11 pl-3 text-left font-normal transition-all duration-200 hover:bg-accent/50 focus:ring-2 focus:ring-primary/20 focus:border-primary',
                                    !field.value && 'text-muted-foreground',
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50 transition-opacity duration-200 group-hover:opacity-70" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 shadow-lg border-border/50"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date <
                                  new Date(
                                    new Date().setDate(
                                      new Date().getDate() - 1,
                                    ),
                                  )
                                }
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-3">
                          <FormLabel className="text-sm font-medium leading-none">Time (24h)</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-3">
                          <FormLabel className="text-sm font-medium leading-none">Duration (min)</FormLabel>
                          <div className="space-y-3">
                            <DurationPresets
                              value={field.value}
                              onChange={(duration) => {
                                field.onChange(duration)
                                // Trigger form validation
                                form.trigger('duration')
                              }}
                              className="mb-2"
                            />
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="30"
                                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0
                                  field.onChange(value)
                                  form.trigger('duration')
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Enhanced Conflict Indicator */}
              {conflicts.length > 0 && (
                <div className={cn(
                  "transition-all duration-300 ease-in-out",
                  isConflictAnimating && "animate-pulse"
                )}>
                  <ConflictIndicator 
                    conflicts={conflicts}
                    onSuggestionClick={handleSuggestionClick}
                    className="mb-6"
                  />
                </div>
              )}

              <AccordionItem value="item-2" isCompleted={isTypeParticipantsComplete}>
                <AccordionTrigger isCompleted={isTypeParticipantsComplete}>
                  <h3 className="text-lg font-medium">Type & Participants</h3>
                </AccordionTrigger>
                <AccordionContent className="space-y-8 pt-6">
                  <FormField
                    control={form.control}
                    name="meetingType"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="text-sm font-medium leading-none">Meeting Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-3"
                          >
                            <FormItem className="flex items-center space-y-0 space-x-3 p-3 rounded-lg border border-border/50 transition-all duration-200 hover:border-border hover:bg-accent/30">
                              <FormControl>
                                <RadioGroupItem value="internal" className="transition-all duration-200" />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-medium cursor-pointer">
                                  Internal
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">Private meeting for team members</p>
                              </div>
                            </FormItem>
                            <FormItem className="flex items-center space-y-0 space-x-3 p-3 rounded-lg border border-border/50 transition-all duration-200 hover:border-border hover:bg-accent/30">
                              <FormControl>
                                <RadioGroupItem value="external" className="transition-all duration-200" />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-medium cursor-pointer">
                                  Public External
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">Visible on public calendar with meeting details</p>
                              </div>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription className="text-xs leading-relaxed">
                          Internal meetings will not show Meeting ID on the public calendar.
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="participants"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-medium leading-none">Participants</FormLabel>
                        <FormControl>
                          <div className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 rounded-md">
                            <UserCombobox
                              allUsers={allUsers.filter(
                                (u) => u.email !== user?.email,
                              )}
                              selectedUsers={field.value ?? []}
                              onChange={field.onChange}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs leading-relaxed">
                          Select users to invite to the meeting.
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" isCompleted={isLocationDetailsComplete}>
                <AccordionTrigger isCompleted={isLocationDetailsComplete}>
                  <h3 className="text-lg font-medium">
                    Location & Details (Optional)
                  </h3>
                </AccordionTrigger>
                <AccordionContent className="space-y-8 pt-6">
                  <FormField
                    control={form.control}
                    name="isZoomMeeting"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-5 transition-all duration-200 hover:border-border hover:bg-accent/20">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-medium leading-none">Create Zoom Meeting</FormLabel>
                          <FormDescription className="text-xs leading-relaxed">
                            A Zoom meeting link will be generated automatically.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="transition-all duration-200"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="space-y-6 mt-8">
                    <FormField
                      control={form.control}
                      name="meetingRoomId"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-medium leading-none">Meeting Room</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value ?? undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                <SelectValue placeholder="Select a meeting room" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="shadow-lg border-border/50">
                              {meetingRooms.map((room) => (
                                <SelectItem key={room.id} value={room.id} className="transition-colors duration-150">
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs leading-relaxed">
                            Choose a physical location for the meeting.
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-sm font-medium leading-none">Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Agenda, notes, and links..."
                              className="min-h-[100px] resize-none transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    {isZoomMeeting && (
                      <FormField
                        control={form.control}
                        name="zoomPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <FormLabel className="text-sm font-medium leading-none">Zoom Meeting Password</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter password for Zoom meeting"
                                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription className="text-xs leading-relaxed">
                              Only required if this will be a Zoom meeting.
                            </FormDescription>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
          <CardFooter className="flex justify-end gap-4 pt-8 border-t border-border/30 bg-card/30 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-11 px-6 transition-all duration-200 hover:bg-accent/50 hover:border-border focus:ring-2 focus:ring-primary/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || hasBlockingConflicts}
              className={cn(
                "h-11 px-6 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
                hasBlockingConflicts && "opacity-50 cursor-not-allowed",
                !hasBlockingConflicts && "hover:shadow-md active:scale-[0.98]"
              )}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Create Meeting'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}