'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import {
  Calendar,
  Clock,
  Users,
  Link as LinkIcon,
  Info,
  User,
  Copy,
  Eye,
  EyeOff,
  Building2,
  Clipboard,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Meeting } from '@/lib/data'

// Extended meeting type with additional fields from API
interface ExtendedMeeting
  extends Omit<Meeting, 'zoomMeetingId' | 'zoomJoinUrl' | 'zoomPassword'> {
  start?: string
  organizerName?: string
  meetingRoom?: string | null
  zoomJoinUrl?: string | null
  zoomPassword?: string | null
  zoomMeetingId?: string | null
}

interface UnifiedMeetingDetailsProps {
  meeting: ExtendedMeeting | null
  isOpen: boolean
  onClose: () => void
}

export function UnifiedMeetingDetails({
  meeting,
  isOpen,
  onClose,
}: UnifiedMeetingDetailsProps) {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [hostKey, setHostKey] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showHostKey, setShowHostKey] = useState(false)

  const isOrganizer = meeting && session?.user?.id === meeting.organizerId
  const isAdmin = session?.user?.role === 'admin'
  const canViewHostKey = isOrganizer || isAdmin

  useEffect(() => {
    if (isOpen && canViewHostKey && meeting?.isZoomMeeting) {
      fetch(
        `/api/zoom-settings/host-key?zoomMeetingId=${meeting.zoomMeetingId}`,
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.hostKey) {
            setHostKey(data.hostKey)
          }
        })
        .catch((error) => {
          console.error('Error fetching host key:', error)
          setHostKey(null)
        })
    } else {
      setHostKey(null)
    }
  }, [isOpen, canViewHostKey, meeting])

  if (!meeting) return null

  const meetingDateStr = meeting.start || meeting.date
  const now = new Date()
  const meetingDate = new Date(meetingDateStr)
  const meetingEndTime = new Date(
    meetingDate.getTime() + (meeting.duration || 0) * 60 * 1000,
  )
  const isPastMeeting = now > meetingEndTime

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copied!',
          description: `${label} copied to clipboard`,
        })
      },
      () => {
        toast({
          variant: 'destructive',
          title: 'Failed to copy',
          description: 'Could not copy to clipboard',
        })
      },
    )
  }

  const safeFormatDate = (
    date: string | Date | undefined,
    formatString: string,
  ) => {
    if (!date) {
      return 'No date provided'
    }
    try {
      const dateToFormat = typeof date === 'string' ? new Date(date) : date
      return format(dateToFormat, formatString)
    } catch {
      console.error('Invalid date provided to format:', date)
      return 'Invalid date'
    }
  }

  const copyInvitation = () => {
    if (!meeting) return

    // Debug: Log meeting data to check fields
    console.log('Meeting data for copy invitation:', meeting)
    console.log('meetingRoomId:', meeting.meetingRoomId)
    console.log('meetingRoom:', meeting.meetingRoom)

    // Format Meeting ID with spaces (xxx xxxx xxxx)
    const formatMeetingId = (id: string) => {
      if (!id || id.length < 10) return id
      return id.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')
    }

    let invitation = `bpkad@jabarprov.go.id is inviting you to a scheduled Zoom meeting.\n\n`
    invitation += `Penanggung Jawab:\n${meeting.organizerName || 'Unknown Organizer'}\n\n`
    invitation += `Topic: ${meeting.title}\n`

    if (meeting.description) {
      invitation += `Description: ${meeting.description}\n`
    }

    invitation += `Time: ${safeFormatDate(meetingDateStr, 'PPpp')}\n`

    // Add Zoom details if it's a Zoom meeting
    if (meeting.isZoomMeeting && meeting.zoomJoinUrl) {
      invitation += `Join Zoom Meeting\n${meeting.zoomJoinUrl}\n\n`

      if (meeting.zoomMeetingId) {
        invitation += `Meeting ID: ${formatMeetingId(meeting.zoomMeetingId)}\n`
      }

      if (meeting.zoomPassword) {
        invitation += `Passcode: ${meeting.zoomPassword}\n`
      }
    }

    // Add location for hybrid meetings - check both possible field names
    const meetingLocation = meeting.meetingRoom || meeting.meetingRoomId
    if (meetingLocation) {
      invitation += `\nLokasi Meeting: ${meetingLocation}\n`
    }

    copyToClipboard(invitation, 'Meeting Invitation')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{meeting.title}</DialogTitle>
          <div className="mt-1.5 flex items-center gap-2">
            <DialogDescription>
              Details for your scheduled meeting.
            </DialogDescription>
            {isPastMeeting && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                Selesai
              </Badge>
            )}
          </div>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-start gap-4">
            <Calendar className="text-muted-foreground mt-1 h-5 w-5" />
            <div>
              <h4 className="font-semibold">Date & Time</h4>
              <p className="text-muted-foreground">
                {safeFormatDate(meetingDateStr, 'PPPP p')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Clock className="text-muted-foreground mt-1 h-5 w-5" />
            <div>
              <h4 className="font-semibold">Duration (minutes)</h4>
              <p className="text-muted-foreground">{meeting.duration}</p>
            </div>
          </div>
          {(meeting.meetingRoom || meeting.meetingRoomId) && (
            <div className="flex items-start gap-4">
              <Building2 className="text-muted-foreground mt-1 h-5 w-5" />
              <div>
                <h4 className="font-semibold">Meeting Room</h4>
                <p className="text-muted-foreground">
                  {meeting.meetingRoom || meeting.meetingRoomId}
                </p>
              </div>
            </div>
          )}
          {meeting.description && (
            <div className="flex items-start gap-4">
              <Info className="text-muted-foreground mt-1 h-5 w-5" />
              <div>
                <h4 className="font-semibold">Description</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {meeting.description}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-4">
            <Users className="text-muted-foreground mt-1 h-5 w-5" />
            <div>
              <h4 className="font-semibold">Participants</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {meeting.participants &&
                typeof meeting.participants === 'string' &&
                meeting.participants.length > 0 ? (
                  meeting.participants.split(',').map((p: string) => (
                    <Badge key={p} variant="secondary">
                      {p.trim()}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No participants other than the organizer.
                  </p>
                )}
              </div>
            </div>
          </div>
          {meeting.isZoomMeeting && meeting.zoomJoinUrl && (
            <div className="flex items-start gap-4">
              <LinkIcon className="text-muted-foreground mt-1 h-5 w-5" />
              <div>
                <h4 className="font-semibold">Zoom Meeting Link</h4>
                <a
                  href={meeting.zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm break-all hover:underline"
                >
                  {meeting.zoomJoinUrl}
                </a>
                {meeting.zoomPassword && (
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Password:</span>
                    <span className="font-mono">
                      {showPassword ? meeting.zoomPassword : '••••••••'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          {canViewHostKey && hostKey && (
            <div className="flex items-start gap-4">
              <User className="text-muted-foreground mt-1 h-5 w-5" />
              <div>
                <h4 className="flex items-center justify-between font-semibold">
                  <span>Host Key</span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setShowHostKey(!showHostKey)}
                    >
                      {showHostKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
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
                <p className="text-muted-foreground font-mono text-sm">
                  {showHostKey ? hostKey : '••••••'}
                </p>
                <p className="text-muted-foreground mt-1 text-xs italic">
                  Gunakan Host Key untuk claim Host
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={copyInvitation}>
            <Clipboard className="mr-2 h-4 w-4" />
            Copy Invitation
          </Button>
          {meeting.isZoomMeeting && meeting.zoomJoinUrl && !isPastMeeting && (
            <Button asChild>
              <a
                href={meeting.zoomJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Join Meeting
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
