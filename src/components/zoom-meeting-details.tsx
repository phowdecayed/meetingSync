'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, Calendar, Link as LinkIcon, User, Copy, Key, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ZoomMeetingDetail {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  host_url?: string;
  password?: string;
  description?: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
  };
  isOrganizer?: boolean;
  participants?: string[];
}

interface ZoomMeetingDetailsProps {
  meeting?: ZoomMeetingDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

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

export function ZoomMeetingDetails({ meeting, isOpen, onClose }: ZoomMeetingDetailsProps) {
  const { toast } = useToast();
  const [hostKey, setHostKey] = useState<string | null>(null);
  const [detailedMeeting, setDetailedMeeting] = useState<ZoomMeetingDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch detailed meeting info from database when opened
  useEffect(() => {
    if (isOpen && meeting) {
      setLoading(true);
      // Fetch meeting details from our API that includes organizer info
      fetch(`/api/zoom-meetings/${meeting.id}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch meeting details');
          }
          return response.json();
        })
        .then(data => {
          setDetailedMeeting({
            ...meeting,
            description: data.description,
            organizer: data.organizer,
            isOrganizer: data.isOrganizer,
            participants: data.participants,
            password: data.password || meeting.password // Use database password or fallback to API
          });
          
          // If user is the organizer, fetch host key
          if (data.isOrganizer) {
            fetchHostKey();
          }
        })
        .catch(error => {
          console.error('Error fetching meeting details:', error);
          // Fallback to the basic meeting data
          setDetailedMeeting(meeting);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDetailedMeeting(null);
    }
  }, [isOpen, meeting]);

  const fetchHostKey = () => {
    fetch('/api/zoom-settings/host-key')
      .then(response => response.json())
      .then(data => {
        if (data.hostKey) {
          setHostKey(data.hostKey);
        }
      })
      .catch(error => {
        console.error('Error fetching host key:', error);
        setHostKey(null);
      });
  };

  // Use the detailed meeting if available, otherwise use the passed meeting
  const activeMeeting = detailedMeeting || meeting;

  if (!activeMeeting) return null;

  const meetingDate = new Date(activeMeeting.start_time);
  const status = getMeetingStatus(activeMeeting.start_time, activeMeeting.duration);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copied!",
          description: `${label} copied to clipboard`,
        });
      },
      () => {
        toast({
          variant: "destructive",
          title: "Failed to copy",
          description: "Could not copy to clipboard",
        });
      }
    );
  };

  const handleJoinMeeting = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (activeMeeting.password) {
      // Don't prevent default behavior, allow the link to be followed
      toast({
        title: "Meeting Password",
        description: `Password: ${activeMeeting.password}`,
        duration: 10000, // Show for 10 seconds to give user time to read and copy
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{activeMeeting.topic}</DialogTitle>
          <div className="flex items-center gap-2 mt-1.5">
            <DialogDescription>
              Zoom meeting details
            </DialogDescription>
            {status === 'past' && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500">Selesai</Badge>
            )}
            {status === 'ongoing' && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">Sedang Berlangsung</Badge>
            )}
            {status === 'upcoming' && (
              <Badge variant="outline" className="border-blue-300 text-blue-600">Belum Mulai</Badge>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {detailedMeeting?.organizer && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Organizer</h4>
                <p className="text-sm text-gray-500">
                  {detailedMeeting.organizer.name} ({detailedMeeting.organizer.email})
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div>
              <h4 className="font-medium text-sm">Date and Time</h4>
              <p className="text-sm text-gray-500">
                {format(meetingDate, 'EEEE, MMMM d, yyyy')} at {format(meetingDate, 'h:mm a')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-500" />
            <div>
              <h4 className="font-medium text-sm">Duration</h4>
              <p className="text-sm text-gray-500">
                {activeMeeting.duration} minutes
              </p>
            </div>
          </div>

          {activeMeeting.description && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Description</h4>
                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                  {activeMeeting.description}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <LinkIcon className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm flex items-center justify-between">
                <span>Meeting Link</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2"
                  onClick={() => copyToClipboard(activeMeeting.join_url, 'Join URL')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </h4>
              <p className="text-sm text-blue-600 break-all hover:underline">
                <a href={activeMeeting.join_url} target="_blank" rel="noopener noreferrer">
                  {activeMeeting.join_url}
                </a>
              </p>
            </div>
          </div>
          
          {activeMeeting.password && (
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm flex items-center justify-between">
                  <span>Meeting Password</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2"
                    onClick={() => copyToClipboard(activeMeeting.password || "", 'Meeting Password')}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </h4>
                <p className="text-sm text-gray-500 font-mono">
                  {activeMeeting.password}
                </p>
              </div>
            </div>
          )}
          
          {/* Show Host Key only to the meeting organizer */}
          {detailedMeeting?.isOrganizer && hostKey && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm flex items-center justify-between">
                  <span>Host Key</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2"
                    onClick={() => copyToClipboard(hostKey, 'Host Key')}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </h4>
                <p className="text-sm text-gray-500">
                  {hostKey}
                </p>
                <p className="text-xs text-gray-500 mt-1 italic">
                  Gunakan Host Key untuk claim Host
                </p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {status === 'past' ? (
            <Button 
              variant="outline"
              disabled
              className="opacity-60 cursor-not-allowed"
              title="Meeting has ended"
            >
              Meeting Ended
            </Button>
          ) : (
            <Button asChild variant={status === 'ongoing' ? "default" : "outline"} className={status === 'ongoing' ? "bg-green-600 hover:bg-green-700" : ""}>
              <a 
                href={activeMeeting.join_url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleJoinMeeting}
              >
                {status === 'ongoing' ? 'Join Now' : 'Join Meeting'}
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 