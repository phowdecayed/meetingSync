'use client';

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
import type { Meeting } from '@/lib/data';
import { format } from 'date-fns';
import { Calendar, Clock, Users, Link as LinkIcon, Info, User, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface MeetingDetailsDialogProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MeetingDetailsDialog({ meeting, isOpen, onClose }: MeetingDetailsDialogProps) {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [hostKey, setHostKey] = useState<string | null>(null);
  
  // Determine if the current user is the organizer
  const isOrganizer = meeting && session?.user?.id === meeting.organizerId;
  
  useEffect(() => {
    // Fetch host key only if user is the organizer
    if (isOpen && isOrganizer) {
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
    } else {
      setHostKey(null);
    }
  }, [isOpen, isOrganizer]);
  
  if (!meeting) return null;

  // Determine if the meeting is in the past
  const now = new Date();
  const meetingDate = new Date(meeting.date);
  const meetingEndTime = new Date(meetingDate.getTime() + meeting.duration * 60 * 1000);
  const isPastMeeting = now > meetingEndTime;
  
  const handleJoinMeeting = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (meeting.zoomPassword) {
      // Show toast with password information
      toast({
        title: "Meeting Password",
        description: `Password: ${meeting.zoomPassword}`,
        duration: 10000, // Show for 10 seconds to give user time to read and copy
      });
    }
  };
  
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{meeting.title}</DialogTitle>
          <div className="flex items-center gap-2 mt-1.5">
            <DialogDescription>
              Details for your scheduled meeting.
            </DialogDescription>
            {isPastMeeting && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500">Selesai</Badge>
            )}
          </div>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-start gap-4">
            <Calendar className="h-5 w-5 mt-1 text-muted-foreground" />
            <div>
              <h4 className="font-semibold">Date & Time</h4>
              <p className="text-muted-foreground">{format(new Date(meeting.date), 'PPPP p')}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Clock className="h-5 w-5 mt-1 text-muted-foreground" />
            <div>
              <h4 className="font-semibold">Duration</h4>
              <p className="text-muted-foreground">{meeting.duration} minutes</p>
            </div>
          </div>
          {meeting.description && (
             <div className="flex items-start gap-4">
                <Info className="h-5 w-5 mt-1 text-muted-foreground" />
                <div>
                    <h4 className="font-semibold">Description</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{meeting.description}</p>
                </div>
            </div>
          )}
          <div className="flex items-start gap-4">
            <Users className="h-5 w-5 mt-1 text-muted-foreground" />
            <div>
              <h4 className="font-semibold">Participants</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {meeting.participants.length > 0 ? (
                  meeting.participants.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)
                ) : (
                  <p className="text-sm text-muted-foreground">No participants other than the organizer.</p>
                )}
              </div>
            </div>
          </div>
          {meeting.zoomJoinUrl ? (
            <div className="flex items-start gap-4">
              <LinkIcon className="h-5 w-5 mt-1 text-muted-foreground" />
              <div>
                <h4 className="font-semibold">Zoom Meeting Link</h4>
                <a href={meeting.zoomJoinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                  {meeting.zoomJoinUrl}
                </a>
                {meeting.zoomPassword && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Password: <span className="font-mono">{meeting.zoomPassword}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <LinkIcon className="h-5 w-5 mt-1 text-muted-foreground" />
              <div>
                <h4 className="font-semibold">Zoom Meeting Link</h4>
                <p className="text-sm text-muted-foreground">
                  Zoom meeting link not available. Please check back later.
                </p>
              </div>
            </div>
          )}
          
          {/* Only show host key to the organizer */}
          {isOrganizer && hostKey && (
            <div className="flex items-start gap-4">
              <User className="h-5 w-5 mt-1 text-muted-foreground" />
              <div>
                <h4 className="font-semibold flex items-center justify-between">
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
                <p className="text-sm text-muted-foreground font-mono">
                  {hostKey}
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Gunakan Host Key untuk claim Host
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {meeting.zoomJoinUrl && (
            isPastMeeting ? (
              <Button 
                variant="outline"
                disabled
                className="opacity-60 cursor-not-allowed"
                title="Meeting has ended"
              >
                Meeting Ended
              </Button>
            ) : (
              <Button asChild>
                <a 
                  href={meeting.zoomJoinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={handleJoinMeeting}
                >
                  Join Meeting
                </a>
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
