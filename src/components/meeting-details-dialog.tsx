
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
import { Calendar, Clock, Users, Link as LinkIcon, Info } from 'lucide-react';

interface MeetingDetailsDialogProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MeetingDetailsDialog({ meeting, isOpen, onClose }: MeetingDetailsDialogProps) {
  if (!meeting) return null;

  // Placeholder for Zoom link logic
  const zoomLink = `https://zoom.us/j/${meeting.zoomAccountId.replace(/\D/g, '')}12345`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{meeting.title}</DialogTitle>
          <DialogDescription>
            Details for your scheduled meeting.
          </DialogDescription>
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
          <div className="flex items-start gap-4">
            <LinkIcon className="h-5 w-5 mt-1 text-muted-foreground" />
            <div>
              <h4 className="font-semibold">Zoom Meeting Link</h4>
              <a href={zoomLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                {zoomLink}
              </a>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button asChild>
            <a href={zoomLink} target="_blank" rel="noopener noreferrer">Join Meeting</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
