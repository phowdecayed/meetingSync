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
          <CardTitle>Jadwal Saya</CardTitle>
          <CardDescription>
            Lihat semua meeting dan janji temu yang akan datang.
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
                  placeholder="Cari meeting berdasarkan topik..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter berdasarkan status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="upcoming">Akan Datang</SelectItem>
                    <SelectItem value="ongoing">Sedang Berlangsung</SelectItem>
                    <SelectItem value="past">Selesai</SelectItem>
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
                Tidak ada meeting yang sesuai dengan kriteria pencarian.
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedMeetings.map((meeting) => {
                  const status = getMeetingStatus(meeting.start, meeting.end)
                  const canDelete =
                    (meeting.source === 'local' ||
                      (meeting.source === 'zoom' &&
                        session?.user?.role === 'admin')) &&
                    status === 'upcoming'

                  const statusColors = {
                    upcoming: 'bg-blue-50 border-blue-200 text-blue-800',
                    ongoing: 'bg-green-50 border-green-200 text-green-800',
                    past: 'bg-gray-50 border-gray-200 text-gray-600',
                  }

                  const statusLabels = {
                    upcoming: 'Akan Datang',
                    ongoing: 'Sedang Berlangsung',
                    past: 'Selesai',
                  }

                  return (
                    <Card
                      key={meeting.id}
                      className="border-l-4 border-l-blue-500 transition-shadow duration-200 hover:shadow-md"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                                  {meeting.title}
                                </h3>
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
                                >
                                  {statusLabels[status]}
                                </span>
                              </div>
                              <div className="ml-4 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openMeetingDetails(meeting)}
                                  className="h-8 px-3"
                                >
                                  <Eye className="mr-1 h-3 w-3" />
                                  Detail
                                </Button>
                                {canDelete && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      confirmDeleteMeeting(meeting)
                                    }
                                    className="h-8 px-3"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                              <div className="flex items-center text-gray-600">
                                <Clock className="mr-2 h-4 w-4 text-blue-500" />
                                <div>
                                  <div className="font-medium">
                                    {new Date(meeting.start).toLocaleDateString(
                                      'id-ID',
                                      {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      },
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(meeting.start).toLocaleTimeString(
                                      'id-ID',
                                      {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      },
                                    )}{' '}
                                    -{' '}
                                    {new Date(meeting.end).toLocaleTimeString(
                                      'id-ID',
                                      {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      },
                                    )}{' '}
                                    ({meeting.duration} menit)
                                  </div>
                                </div>
                              </div>

                              {meeting.participants &&
                                meeting.participants.length > 0 && (
                                  <div className="flex items-center text-gray-600">
                                    <User className="mr-2 h-4 w-4 text-green-500" />
                                    <div>
                                      <div className="font-medium">Peserta</div>
                                      <div className="truncate text-xs text-gray-500">
                                        {meeting.participants
                                          .slice(0, 2)
                                          .join(', ')}
                                        {meeting.participants.length > 2 &&
                                          ` +${meeting.participants.length - 2} lainnya`}
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {meeting.meetingRoom && (
                                <div className="flex items-center text-gray-600">
                                  <Building2 className="mr-2 h-4 w-4 text-purple-500" />
                                  <div>
                                    <div className="font-medium">Lokasi</div>
                                    <div className="text-xs text-gray-500">
                                      {meeting.meetingRoom}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {meeting.source && (
                                <div className="flex items-center text-gray-600">
                                  <div
                                    className={`mr-2 h-2 w-2 rounded-full ${
                                      meeting.source === 'zoom'
                                        ? 'bg-blue-500'
                                        : 'bg-gray-500'
                                    }`}
                                  />
                                  <div>
                                    <div className="font-medium">Sumber</div>
                                    <div className="text-xs text-gray-500 capitalize">
                                      {meeting.source}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
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
