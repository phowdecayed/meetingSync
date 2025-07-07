'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, Info, Eye, EyeOff } from 'lucide-react';
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
};

export function ZoomCalendar() {
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();
  
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
    // First set the basic meeting info we have from the Zoom API
    setSelectedMeeting(meeting);
    setIsDetailsModalOpen(true);
    
    // Then try to fetch detailed information from our database
    fetch(`/api/zoom-meetings/${meeting.id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch meeting details');
        }
        return response.json();
      })
      .then(data => {
        // Update with database information (which includes password, description, organizer)
        setSelectedMeeting({
          ...meeting,
          password: data.password || meeting.password,
          description: data.description,
        });
      })
      .catch(error => {
        console.error('Error fetching meeting details:', error);
        // Keep using the basic meeting data if fetch fails
      });
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openMeetingDetails(meeting)}
                          >
                            <Info className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          
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
        {/* Meeting Details Modal */}
        <ZoomMeetingDetails
          meeting={selectedMeeting}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      </CardContent>
    </Card>
  );
} 