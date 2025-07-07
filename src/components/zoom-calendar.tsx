'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

type ZoomMeeting = {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
};

export function ZoomCalendar() {
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchZoomMeetings();
  }, []);

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
    fetchZoomMeetings();
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Zoom Meetings Calendar</CardTitle>
          <CardDescription>
            View all scheduled Zoom meetings for your account.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading && meetings.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No scheduled Zoom meetings found.
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="rounded-lg border p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{meeting.topic}</h3>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-2">
                      <span className="flex items-center gap-1">
                        <Badge variant="outline">
                          {format(new Date(meeting.start_time), 'dd MMM yyyy, HH:mm')}
                        </Badge>
                      </span>
                      <span>Duration: {meeting.duration} minutes</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <Button size="sm" asChild>
                      <a href={meeting.join_url} target="_blank" rel="noopener noreferrer">
                        Join Meeting
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMore && !loading && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 