'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { UnifiedMeetingDetails } from './unified-meeting-details'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EventClickArg } from '@fullcalendar/core'
import { Meeting } from '@/lib/data'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  RefreshCw,
  Search,
  Loader2,
  Clock,
  User,
  Building2,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MeetingStatus, UnifiedMeeting } from '@/types/meeting'

function getMeetingStatus(startTime: string, endTime: string): MeetingStatus {
  const now = new Date()
  const meetingStart = new Date(startTime)
  const meetingEnd = new Date(endTime)

  if (now < meetingStart) return 'upcoming'
  if (now >= meetingStart && now <= meetingEnd) return 'ongoing'
  return 'past'
}

export function UnifiedScheduleView() {
  const { data: session } = useSession()
  const [meetings, setMeetings] = useState<UnifiedMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list')
  const [selectedMeeting, setSelectedMeeting] = useState<UnifiedMeeting | null>(
    null,
  )
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [meetingToDelete, setMeetingToDelete] = useState<UnifiedMeeting | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)

  // State for List View
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('upcoming')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/schedule')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch schedule')
      }
      setMeetings(data)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, itemsPerPage])

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
    )
  }, [meetings])

  const filteredMeetings = useMemo(() => {
    return sortedMeetings.filter((meeting) => {
      const status = getMeetingStatus(meeting.start, meeting.end)
      const searchMatch = meeting.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const statusMatch = statusFilter === 'all' || status === statusFilter
      return searchMatch && statusMatch
    })
  }, [sortedMeetings, searchTerm, statusFilter])

  const paginatedMeetings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredMeetings.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredMeetings, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage)

  function openMeetingDetails(meeting: UnifiedMeeting) {
    setSelectedMeeting(meeting)
    setIsDetailsModalOpen(true)
  }

  function confirmDeleteMeeting(meeting: UnifiedMeeting) {
    setMeetingToDelete(meeting)
    setIsDeleteAlertOpen(true)
  }

  async function handleDeleteMeeting() {
    if (!meetingToDelete) return
    setIsDeleting(true)
    try {
      const url =
        meetingToDelete.source === 'local'
          ? `/api/meetings?id=${meetingToDelete.id}`
          : `/api/zoom-meetings/${meetingToDelete.id}`
      const response = await fetch(url, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete meeting')
      }
      toast({
        title: 'Success',
        description: `Meeting "${meetingToDelete.title}" has been deleted.`,
      })
      setMeetings((prev) => prev.filter((m) => m.id !== meetingToDelete.id))
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteAlertOpen(false)
      setMeetingToDelete(null)
    }
  }

  const calendarEvents = useMemo(
    () =>
      meetings.map((meeting) => ({
        id: String(meeting.id),
        title: meeting.title,
        start: new Date(meeting.start),
        end: new Date(meeting.end),
        extendedProps: { ...meeting },
      })),
    [meetings],
  )

  const handleEventClick = (clickInfo: EventClickArg) => {
    openMeetingDetails(clickInfo.event.extendedProps as UnifiedMeeting)
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>My Schedule</CardTitle>
          <CardDescription>
            View all your upcoming meetings and appointments.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMeetings}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'list' | 'calendar')}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  placeholder="Search meetings by topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(v) => setItemsPerPage(Number(v))}
                >
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / page</SelectItem>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : paginatedMeetings.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                No meetings match your criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedMeetings.map((meeting) => {
                  const status = getMeetingStatus(meeting.start, meeting.end)
                  const canDelete =
                    (meeting.source === 'local' ||
                      (meeting.source === 'zoom' &&
                        session?.user?.role === 'admin')) &&
                    status === 'upcoming'
                  return (
                    <Card key={meeting.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {meeting.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-3">
                        <div className="text-muted-foreground flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4" />
                          <span>
                            {new Date(meeting.start).toLocaleTimeString()} (
                            {meeting.duration} min)
                          </span>
                        </div>
                        <div className="text-muted-foreground flex items-center text-sm">
                          <User className="mr-2 h-4 w-4" />
                          <span className="truncate">
                            {meeting.participants?.join(', ')}
                          </span>
                        </div>
                        {meeting.meetingRoom && (
                          <div className="text-muted-foreground flex items-center text-sm">
                            <Building2 className="mr-2 h-4 w-4" />
                            <span>{meeting.meetingRoom}</span>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMeetingDetails(meeting)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Details
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirmDeleteMeeting(meeting)}
                          disabled={!canDelete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="calendar">
            <div className="h-[75vh] w-full">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                themeSystem="standard"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                events={calendarEvents}
                eventClick={handleEventClick}
                height="100%"
                locale="id"
              />
            </div>
          </TabsContent>
        </Tabs>

        <UnifiedMeetingDetails
          meeting={selectedMeeting as unknown as Meeting}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        />

        <AlertDialog
          open={isDeleteAlertOpen}
          onOpenChange={setIsDeleteAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the meeting &quot;
                {meetingToDelete?.title}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMeeting}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
