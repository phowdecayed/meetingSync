'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, Info, Eye, EyeOff, Trash2, MoreHorizontal, Pencil } from 'lucide-react';
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from './ui/badge';
import { format, isSameDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ZoomMeetingDetails } from './zoom-meeting-details';
import { ToastAction } from '@/components/ui/toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Calendar } from './ui/calendar';
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
// Function to determine meeting status
function getMeetingStatus(startTime: string, duration: number): 'past' | 'ongoing' | 'upcoming' {

  const now = new Date();
  const meetingStart = new Date(startTime);
  const meetingEnd = new Date(meetingStart.getTime() + duration * 60 * 1000); // duration is in minutes
  
  if (now < meetingStart) {
    return 'upcoming';
  } else if (now >= meetingStart && now <= meetingEnd) {
    return 'ongoing';
  } else {
    return 'past';
  }
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
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'past' | 'ongoing' | 'upcoming'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Meeting details modal state
  const [selectedMeeting, setSelectedMeeting] = useState<ZoomMeeting | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<Date | undefined>(new Date());

  // Delete confirmation state
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<ZoomMeeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    fetchZoomMeetings();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, itemsPerPage]);

  async function fetchZoomMeetings(pageToken?: string) {
    try {
      setLoading(true);
      
      const url = new URL('/api/zoom-meetings', window.location.origin);
      if (pageToken) {
        url.searchParams.append('next_page_token', pageToken);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to fetch Zoom meetings');
      }
      
      const data = await response.json();
      
      if (pageToken) {
        setMeetings(prev => [...prev, ...data.meetings]);
      } else {
        setMeetings(data.meetings);
      }
      
      setNextPageToken(data.nextPageToken || null);
      setHasMore(!!data.nextPageToken);
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

  function loadMore() {
    if (nextPageToken) {
      fetchZoomMeetings(nextPageToken);
    }
  }

  function refresh() {
    setMeetings([]);
    setNextPageToken(null);
    setCurrentPage(1);
    fetchZoomMeetings();
  }

  // Apply filters to meetings
  const filteredMeetings = meetings.filter(meeting => {
    const status = getMeetingStatus(meeting.start_time, meeting.duration);
    
    // Apply status filter
    if (statusFilter !== 'all' && statusFilter !== status) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm && !meeting.topic.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // Sort meetings by start time (newest first)
  const sortedMeetings = [...filteredMeetings].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedMeetings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMeetings = sortedMeetings.slice(startIndex, startIndex + itemsPerPage);
  
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center items-center gap-2 mt-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => goToPage(currentPage - 1)} 
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm">
          Page {currentPage} of {totalPages}
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => goToPage(currentPage + 1)} 
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  function openMeetingDetails(meeting: ZoomMeeting) {
    setSelectedMeeting(meeting);
    setIsDetailsModalOpen(true);
  }

  function handleJoinMeeting(meeting: ZoomMeeting) {
    if (meeting.password) {
      // Show toast with hidden password and reveal button
      toast({
        title: "Meeting Password",
        description: (
          <div className="flex items-center space-x-2">
            <span>Password: <span className="font-mono">••••••••</span></span>
          </div>
        ),
        action: (
          <ToastAction altText="Reveal password" onClick={() => {
            toast({
              title: "Meeting Password",
              description: `Password: ${meeting.password}`,
              duration: 10000,
            });
          }}>
            <Eye className="h-4 w-4" />
          </ToastAction>
        ),
        duration: 10000, // Show for 10 seconds to give user time to read and copy
      });
    }
  }

  function confirmDeleteMeeting(meeting: ZoomMeeting) {
    setMeetingToDelete(meeting);
    setIsDeleteAlertOpen(true);
  }

  async function handleDeleteMeeting() {
    if (!meetingToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/zoom-meetings/${meetingToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete meeting');
      }

      toast({ 
        title: "Success", 
        description: `Meeting "${meetingToDelete.topic}" has been deleted.` 
      });

      // Refresh the list
      setMeetings(prev => prev.filter(m => m.id !== meetingToDelete.id));

    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message || "An unknown error occurred." 
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteAlertOpen(false);
      setMeetingToDelete(null);
    }
  }


  // For calendar view
  const meetingsByDay = meetings.reduce((acc, meeting) => {
    const day = format(new Date(meeting.start_time), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(meeting);
    return acc;
  }, {} as Record<string, ZoomMeeting[]>);
  const daysWithMeetings = Object.keys(meetingsByDay).map(dayStr => {
    const [year, month, day] = dayStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });
  const selectedDayMeetings = calendarSelectedDay
    ? meetings.filter(m => isSameDay(new Date(m.start_time), calendarSelectedDay))
    : [];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Zoom Meetings Calendar</CardTitle>
          <CardDescription>
            View all scheduled Zoom meetings for BPKAD Jabar.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'list' | 'calendar')} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* First row on mobile / left side on desktop */}
              <div className="flex gap-2 flex-col sm:flex-row sm:w-1/2">
                {/* Per Page Filter */}
                <div className="w-full sm:w-[180px]">
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => setItemsPerPage(parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Show per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Items Per Page</SelectLabel>
                        <SelectItem value="5">5 per page</SelectItem>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="15">15 per page</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {/* Search Box */}
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search meetings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              {/* Second row on mobile / right side on desktop */}
              <div className="sm:w-[180px] sm:ml-auto">
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => setStatusFilter(value as 'all' | 'past' | 'ongoing' | 'upcoming')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Meeting Status</SelectLabel>
                      <SelectItem value="all">All Meetings</SelectItem>
                      <SelectItem value="upcoming">Belum Mulai</SelectItem>
                      <SelectItem value="ongoing">Sedang Berlangsung</SelectItem>
                      <SelectItem value="past">Selesai</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {loading && meetings.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : paginatedMeetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {filteredMeetings.length === 0 ? (
                  searchTerm || statusFilter !== 'all' ? 
                    "No meetings match your filters." :
                    "No scheduled Zoom meetings found."
                ) : (
                  "No meetings on this page."
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedMeetings.map((meeting) => {
                  const status = getMeetingStatus(meeting.start_time, meeting.duration);
                  const canDelete = (meeting.isOwner || session?.user?.role === 'admin') && status !== 'ongoing' && status !== 'past';
                  return (
                    <div key={meeting.id} className="rounded-lg border p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{meeting.topic}</h3>
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-2">
                            <span className="flex items-center gap-1">
                              <Badge variant="outline">
                                {format(new Date(meeting.start_time), 'dd MMM yyyy, HH:mm')}
                              </Badge>
                            </span>
                            <span className="flex items-center gap-2">
                              Duration: {meeting.duration} minutes
                              {status === 'past' && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-500">Selesai</Badge>
                              )}
                              {status === 'ongoing' && (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">Sedang Berlangsung</Badge>
                              )}
                              {status === 'upcoming' && (
                                <Badge variant="outline" className="border-blue-300 text-blue-600">Belum Mulai</Badge>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openMeetingDetails(meeting)}>
                                <Info className="mr-2 h-4 w-4" />
                                <span>Details</span>
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem 
                                onClick={() => router.push(`/meetings/${(meeting as any).dbId}/edit`)}
                                disabled={status === 'ongoing' || status === 'past' || !(meeting as any).dbId}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem> */}
                              <DropdownMenuItem 
                                onClick={() => confirmDeleteMeeting(meeting)}
                                disabled={!canDelete}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          {status === 'past' ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled
                              className="opacity-60 cursor-not-allowed"
                              title="Meeting has ended"
                            >
                              Meeting Ended
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              asChild
                              variant={status === 'ongoing' ? "default" : "outline"}
                              className={status === 'ongoing' ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              <a 
                                href={meeting.join_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={() => handleJoinMeeting(meeting)}
                              >
                                {status === 'ongoing' ? 'Join Now' : 'Join Meeting'}
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {renderPagination()}
            
            {hasMore && filteredMeetings.length < meetings.length && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Load More Meetings
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="calendar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-1 flex justify-center">
                <Calendar
                  mode="single"
                  selected={calendarSelectedDay}
                  onSelect={setCalendarSelectedDay}
                  modifiers={{ hasMeeting: daysWithMeetings }}
                  modifiersClassNames={{ hasMeeting: 'rdp-day_has-meeting' }}
                  className="border rounded-lg p-2"
                />
              </div>
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">
                  Meetings on {calendarSelectedDay ? format(calendarSelectedDay, 'PPP') : '...'}
                </h3>
                <div className="space-y-4 h-[300px] lg:h-[450px] overflow-y-auto pr-2">
                  {selectedDayMeetings.length > 0 ? (
                    selectedDayMeetings.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map(meeting => {
                      const status = getMeetingStatus(meeting.start_time, meeting.duration);
                      const canDelete = (meeting.isOwner || session?.user?.role === 'admin') && status !== 'ongoing' && status !== 'past';
                      return (
                        <Card key={meeting.id} className="flex flex-col">
                          <CardHeader className="py-4">
                            <CardTitle className="text-lg">{meeting.topic}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-0">
                            <div className="flex items-start gap-4">
                              <Badge variant="outline">
                                {format(new Date(meeting.start_time), 'dd MMM yyyy, HH:mm')}
                              </Badge>
                              <span className="flex items-center gap-2">
                                Duration: {meeting.duration} minutes
                                {status === 'past' && (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-500">Selesai</Badge>
                                )}
                                {status === 'ongoing' && (
                                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">Sedang Berlangsung</Badge>
                                )}
                                {status === 'upcoming' && (
                                  <Badge variant="outline" className="border-blue-300 text-blue-600">Belum Mulai</Badge>
                                )}
                              </span>
                            </div>
                            {meeting.description && (
                              <div className="flex items-start gap-4">
                                <span className="font-semibold text-sm">Description:</span>
                                <span className="text-sm text-muted-foreground whitespace-pre-wrap">{meeting.description}</span>
                              </div>
                            )}
                            <div className="flex items-start gap-4">
                              <span className="font-semibold text-sm">Zoom Link:</span>
                              <span>
                                <a href={meeting.join_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                                  {meeting.join_url}
                                </a>
                              </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => confirmDeleteMeeting(meeting)}
                                disabled={!canDelete}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMeetingDetails(meeting)}
                              >
                                <Info className="h-4 w-4 mr-2" />
                                Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center text-muted-foreground">No meetings for this day.</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <ZoomMeetingDetails
          meeting={selectedMeeting}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        />
         {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the meeting
                <strong>{meetingToDelete?.topic}</strong> and remove it from Zoom.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMeetingToDelete(null)}>Cancel</AlertDialogCancel>
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