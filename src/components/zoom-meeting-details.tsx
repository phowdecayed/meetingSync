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
import { Clock, Calendar, Link as LinkIcon, User, Copy, Key, FileText, Eye, EyeOff, Clipboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showHostKey, setShowHostKey] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<null | {
    summary_title: string;
    summary_content: string;
    summary_created_time: string;
    summary_last_modified_time: string;
    summary_last_modified_user_email: string;
  }>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'detail' | 'summary'>('detail');

  // Fetch detailed meeting info from database when opened
  useEffect(() => {
    if (isOpen && meeting) {
      setLoading(true);
      setActiveTab('detail');
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
      // Fetch meeting summary jika status sudah selesai
      setMeetingSummary(null);
      setLoadingSummary(false);
      fetch(`/api/zoom-meetings/${meeting.id}/meeting_summary`)
        .then(res => {
          if (!res.ok) throw new Error('Gagal mengambil ringkasan meeting');
          return res.json();
        })
        .then(data => {
          setMeetingSummary({
            summary_title: data.summary_title,
            summary_content: data.summary_content,
            summary_created_time: data.summary_created_time,
            summary_last_modified_time: data.summary_last_modified_time,
            summary_last_modified_user_email: data.summary_last_modified_user_email,
          });
        })
        .catch(() => setMeetingSummary(null));
    } else {
      setDetailedMeeting(null);
      setMeetingSummary(null);
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

  const copyInvitation = () => {
    if (!activeMeeting) return;
    const invitation = `bpkad@jabarprov.go.id is inviting you to a scheduled Zoom meeting.\n\n` +
      `Penanggung Jawab:\n${activeMeeting.organizer?.name} (${activeMeeting.organizer?.email})\n\n` +
      `Topic: ${activeMeeting.topic}\n` +
      (activeMeeting.description ? `Description : ${activeMeeting.description}\n` : '') +
      `Time: ${format(meetingDate, 'PP yyyy h:mm a')} Jakarta\n` +
      `Join Zoom Meeting\n${activeMeeting.join_url}\n\n` +
      `Meeting ID: ${String(activeMeeting.id).replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')}\n` +
      (activeMeeting.password ? `Passcode: ${activeMeeting.password}\n` : '');
    navigator.clipboard.writeText(invitation).then(
      () => {
        toast({
          title: "Copied!",
          description: "Invitation copied to clipboard",
        });
      },
      () => {
        toast({
          variant: "destructive",
          title: "Failed to copy",
          description: "Could not copy invitation",
        });
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{activeMeeting.topic}</DialogTitle>
          <div className="flex items-center gap-2 mt-1.5">
            <DialogDescription>
              Zoom meeting details
            </DialogDescription>
            <Badge variant={
              status === 'ongoing' ? "default" : 
              status === 'upcoming' ? "secondary" : 
              "outline"
            }>
              {status === 'ongoing' ? 'In Progress' : 
               status === 'upcoming' ? 'Upcoming' : 
               'Ended'}
            </Badge>
          </div>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'detail' | 'summary')} className="w-full">
          <TabsList className="justify-start">
            <TabsTrigger value="detail">Detail</TabsTrigger>
            <TabsTrigger value="summary" disabled={status !== 'past'}>Ringkasan</TabsTrigger>
          </TabsList>
          <TabsContent value="detail">
            <div className="space-y-4 py-2">
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
                  <h4 className="font-medium text-sm flex items-center">
                    <span>Meeting Link</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 ml-2"
                      onClick={() => copyToClipboard(activeMeeting.join_url, 'Join URL')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 ml-2"
                      onClick={copyInvitation}
                    >
                      <Clipboard className="h-3.5 w-3.5 mr-1" /> Copy Invitation
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
                    <h4 className="font-medium text-sm flex items-center">
                      <span>Meeting Password</span>
                      <div className="flex items-center space-x-2 ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={() => copyToClipboard(activeMeeting.password || "", 'Meeting Password')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </h4>
                    <p className="text-sm text-gray-500 font-mono">
                      {showPassword ? activeMeeting.password : '••••••••'}
                    </p>
                  </div>
                </div>
              )}
              {/* Show Host Key only to the meeting organizer */}
              {detailedMeeting?.isOrganizer && hostKey && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm flex items-center">
                      <span>Host Key</span>
                      <div className="flex items-center space-x-2 ml-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={() => setShowHostKey(!showHostKey)}
                        >
                          {showHostKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={() => copyToClipboard(hostKey, 'Host Key')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </h4>
                    <p className="text-sm text-gray-500 font-mono">
                      {showHostKey ? hostKey : '••••••••'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Gunakan Host Key untuk claim Host
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="summary">
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-base">Ringkasan Meeting</h4>
                {!loadingSummary && meetingSummary && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `# ${meetingSummary.summary_title}\n\n${meetingSummary.summary_content}`
                      ).then(() => {
                        toast({
                          title: 'Berhasil disalin',
                          description: 'Ringkasan meeting berhasil disalin ke clipboard.',
                        });
                      }, () => {
                        toast({
                          variant: 'destructive',
                          title: 'Gagal menyalin',
                          description: 'Tidak dapat menyalin ringkasan meeting.',
                        });
                      });
                    }}
                  >
                    <Clipboard className="h-4 w-4 mr-1" /> Salin Ringkasan
                  </Button>
                )}
              </div>
              {loadingSummary && (
                <div className="text-sm text-gray-500">Memuat ringkasan...</div>
              )}
              {!loadingSummary && meetingSummary ? (
                <div>
                  <div className="font-medium mb-1">{meetingSummary.summary_title}</div>
                  <div className="text-xs text-gray-400 mb-2">
                    Dibuat: {meetingSummary.summary_created_time && new Date(meetingSummary.summary_created_time).toLocaleString('id-ID')}
                    {meetingSummary.summary_last_modified_time && (
                      <> | Diperbarui: {new Date(meetingSummary.summary_last_modified_time).toLocaleString('id-ID')} oleh {meetingSummary.summary_last_modified_user_email}</>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{meetingSummary.summary_content}</ReactMarkdown>
                  </div>
                </div>
              ) : !loadingSummary ? (
                <div className="text-sm text-gray-500">Tidak ada ringkasan meeting.</div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          {status === 'past' ? (
            <Button 
              variant="outline"
              disabled
              className="opacity-60 cursor-not-allowed"
              title="Meeting telah selesai"
            >
              Meeting Selesai
            </Button>
          ) : (
            <Button asChild variant={status === 'ongoing' ? "default" : "outline"} className={status === 'ongoing' ? "bg-green-600 hover:bg-green-700" : ""}>
              <a 
                href={activeMeeting.join_url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleJoinMeeting}
              >
                {status === 'ongoing' ? 'Gabung Sekarang' : 'Gabung Meeting'}
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 