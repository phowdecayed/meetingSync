'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { ZoomMeetingDetails } from './zoom-meeting-details';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { useSession } from 'next-auth/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';

function getMeetingStatus(startTime: string, duration: number): 'past' | 'ongoing' | 'upcoming' {
  const now = new Date();
  const meetingStart = new Date(startTime);
  const meetingEnd = addMinutes(meetingStart, duration);
  
  if (now < meetingStart) return 'upcoming';
  if (now >= meetingStart && now <= meetingEnd) return 'ongoing';
  return 'past';
}

type ZoomMeeting = {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password?: string;
  description?: string;
  isOwner: boolean;
};

export function ZoomCalendar() {
  const { data: session } = useSession();
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [selectedMeeting, setSelectedMeeting] = useState<ZoomMeeting | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<ZoomMeeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for List View
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchZoomMeetings();
  }, []);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  async function fetchZoomMeetings() {
    setLoading(true);
    try {
      const response = await fetch('/api/zoom-meetings');
      if (!response.ok) throw new Error('Failed to fetch Zoom meetings');
      const data = await response.json();
      setMeetings(data.meetings);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to fetch Zoom meetings" 
      });
    } finally {
      setLoading(false);
    }
  }

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    return sortedMeetings.filter(meeting => {
      const status = getMeetingStatus(meeting.start_time, meeting.duration);
      const searchMatch = meeting.topic.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [sortedMeetings, searchTerm, statusFilter]);

  const paginatedMeetings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMeetings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMeetings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);

  function openMeetingDetails(meeting: ZoomMeeting) {
    setSelectedMeeting(meeting);
    setIsDetailsModalOpen(true);
  }

  function confirmDeleteMeeting(meeting: ZoomMeeting) {
    setMeetingToDelete(meeting);
    setIsDeleteAlertOpen(true);
  }

  async function handleDeleteMeeting() {
    if (!meetingToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/zoom-meetings/${meetingToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete meeting');
      }
      toast({ title: "Success", description: `Meeting "${meetingToDelete.topic}" has been deleted.` });
      setMeetings(prev => prev.filter(m => m.id !== meetingToDelete.id));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsDeleting(false);
      setIsDeleteAlertOpen(false);
      setMeetingToDelete(null);
    }
  }

  const calendarEvents = useMemo(() => meetings.map(meeting => ({
    id: String(meeting.id),
    title: meeting.topic,
    start: new Date(meeting.start_time),
    end: addMinutes(new Date(meeting.start_time), meeting.duration),
    extendedProps: { ...meeting }
  })), [meetings]);

  const handleEventClick = (clickInfo: any) => {
    openMeetingDetails(clickInfo.event.extendedProps as ZoomMeeting);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Zoom Meetings Calendar</CardTitle>
          <CardDescription>View all scheduled Zoom meetings.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchZoomMeetings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
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
                <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
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
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : paginatedMeetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No meetings match your criteria.</div>
            ) : (
              <div className="space-y-4">
                {paginatedMeetings.map((meeting) => {
                  const status = getMeetingStatus(meeting.start_time, meeting.duration);
                  const canDelete = (meeting.isOwner || session?.user?.role === 'admin') && status === 'upcoming';
                  return (
                    <div key={meeting.id} className="rounded-lg border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{meeting.topic}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(meeting.start_time), 'dd MMM yyyy, HH:mm')} - {meeting.duration} min
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={status === 'ongoing' ? 'default' : status === 'upcoming' ? 'secondary' : 'outline'}>
                          {status}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => openMeetingDetails(meeting)}>Details</Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDeleteMeeting(meeting)} disabled={!canDelete}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
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
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={calendarEvents}
                eventClick={handleEventClick}
                height="100%"
                locale="id"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <ZoomMeetingDetails
          meeting={selectedMeeting}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        />
        
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the meeting "{meetingToDelete?.topic}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMeeting} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}