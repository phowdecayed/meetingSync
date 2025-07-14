import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Calendar,
  Link as LinkIcon,
  User,
  Copy,
  Key,
  FileText,
  Eye,
  EyeOff,
  Clipboard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

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
function getMeetingStatus(
  startTime: string,
  duration: number,
): "past" | "ongoing" | "upcoming" {
  const now = new Date();
  const meetingStart = new Date(startTime);
  const meetingEnd = new Date(meetingStart.getTime() + duration * 60 * 1000); // duration is in minutes

  if (now < meetingStart) {
    return "upcoming";
  } else if (now >= meetingStart && now <= meetingEnd) {
    return "ongoing";
  } else {
    return "past";
  }
}

export function ZoomMeetingDetails({
  meeting,
  isOpen,
  onClose,
}: ZoomMeetingDetailsProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [hostKey, setHostKey] = useState<string | null>(null);
  const [detailedMeeting, setDetailedMeeting] =
    useState<ZoomMeetingDetail | null>(null);
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
  const [activeTab, setActiveTab] = useState<"detail" | "summary">("detail");

  const fetchHostKey = useCallback(() => {
    fetch("/api/zoom-settings/host-key")
      .then((response) => response.json())
      .then((data) => {
        if (data.hostKey) setHostKey(data.hostKey);
      })
      .catch((error) => {
        console.error("Error fetching host key:", error);
        setHostKey(null);
      });
  }, []);

  // Fetch detailed meeting info from database when opened
  useEffect(() => {
    // Only run if the dialog is open and we have a meeting to display
    if (isOpen && meeting) {
      setActiveTab("detail");

      // Fetch full meeting details from our API
      fetch(`/api/zoom-meetings/${meeting.id}`)
        .then((response) => {
          if (!response.ok) throw new Error("Failed to fetch meeting details");
          return response.json();
        })
        .then((data) => {
          setDetailedMeeting({
            ...meeting,
            description: data.description,
            organizer: data.organizer,
            isOrganizer: data.isOrganizer,
            participants: data.participants,
            password: data.password || meeting.password,
          });

          // If user is the organizer or an admin, fetch the host key
          if (data.isOrganizer || session?.user?.role === "admin") {
            fetchHostKey();
          }
        })
        .catch((error) => {
          console.error("Error fetching meeting details:", error);
          // Fallback to the basic meeting data if the detailed fetch fails
          setDetailedMeeting(meeting);
        });

      // Reset and fetch meeting summary for past meetings
      setMeetingSummary(null);
      const status = getMeetingStatus(meeting.start_time, meeting.duration);
      if (status === "past") {
        setLoadingSummary(true);
        fetch(`/api/zoom-meetings/${meeting.id}/instances`)
          .then((res) =>
            res.ok ? res.json() : Promise.reject("Failed to fetch instances"),
          )
          .then((data) => {
            const meetingUUID = data.meetings?.[0]?.uuid;
            return fetch(
              `/api/zoom-meetings/${meeting.id}/meeting_summary${meetingUUID ? `?uuid=${meetingUUID}` : ""}`,
            );
          })
          .then((res) =>
            res.ok ? res.json() : Promise.reject("Failed to fetch summary"),
          )
          .then((data) => {
            if (data.summary_title) setMeetingSummary(data);
          })
          .catch((err) => console.error("Error fetching meeting summary:", err))
          .finally(() => setLoadingSummary(false));
      }
    } else {
      // Reset state when the dialog is closed
      setDetailedMeeting(null);
      setMeetingSummary(null);
      setHostKey(null);
    }
  }, [isOpen, meeting, session?.user?.role, fetchHostKey]); // Depend on meeting.id to prevent re-renders
  const copyToClipboard = (text: string, label: string): void => {
    navigator.clipboard.writeText(text).then(
      () =>
        toast({
          title: "Copied!",
          description: `${label} copied to clipboard.`,
        }),
      () =>
        toast({
          variant: "destructive",
          title: "Failed to copy",
          description: `Could not copy ${label}.`,
        }),
    );
  };

  const copyInvitation = () => {
    if (!activeMeeting) return;
    const invitation =
      `bpkad@jabarprov.go.id is inviting you to a scheduled Zoom meeting.\n\n` +
      `Penanggung Jawab:\n${activeMeeting.organizer?.name} (${activeMeeting.organizer?.email})\n\n` +
      `Topic: ${activeMeeting.topic}\n` +
      (activeMeeting.description
        ? `Description : ${activeMeeting.description}\n`
        : "") +
      `Time: ${format(new Date(activeMeeting.start_time), "PPpp")}\n` +
      `Join Zoom Meeting\n${activeMeeting.join_url}\n\n` +
      `Meeting ID: ${String(activeMeeting.id).replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3")}\n` +
      (activeMeeting.password ? `Passcode: ${activeMeeting.password}\n` : "");
    copyToClipboard(invitation, "Meeting Invitation");
  };

  const activeMeeting = detailedMeeting || meeting;
  if (!activeMeeting) return null;

  const meetingDate = new Date(activeMeeting.start_time);
  const status = getMeetingStatus(
    activeMeeting.start_time,
    activeMeeting.duration,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{activeMeeting.topic}</DialogTitle>
          <div className="mt-1.5 flex items-center gap-2">
            <DialogDescription>Zoom meeting details</DialogDescription>
            <Badge
              variant={
                status === "ongoing"
                  ? "default"
                  : status === "upcoming"
                    ? "secondary"
                    : "outline"
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "detail" | "summary")}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="detail">Details</TabsTrigger>
            <TabsTrigger value="summary" disabled={status !== "past"}>
              Summary
            </TabsTrigger>
          </TabsList>
          <TabsContent value="detail" className="space-y-4 py-2">
            {/* Organizer, Date, Duration, etc. */}
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 text-gray-500" />
              <div>
                <h4 className="text-sm font-medium">Organizer</h4>
                <p className="text-sm text-gray-500">
                  {detailedMeeting?.organizer?.name || "Loading..."} (
                  {detailedMeeting?.organizer?.email || "..."})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <h4 className="text-sm font-medium">Date and Time</h4>
                <p className="text-sm text-gray-500">
                  {format(meetingDate, "EEEE, MMMM d, yyyy")} at{" "}
                  {format(meetingDate, "h:mm a")}
                </p>
              </div>
            </div>
            {activeMeeting.description && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-gray-500" />
                <div>
                  <h4 className="text-sm font-medium">Description</h4>
                  <p className="text-sm whitespace-pre-wrap text-gray-500">
                    {activeMeeting.description}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <LinkIcon className="mt-0.5 h-5 w-5 text-gray-500" />
              <div className="flex-1">
                <h4 className="flex items-center text-sm font-medium">
                  <span>Meeting Link</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-6 px-2"
                    onClick={() =>
                      copyToClipboard(activeMeeting.join_url, "Join URL")
                    }
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 h-6 px-2"
                    onClick={copyInvitation}
                  >
                    <Clipboard className="mr-1 h-3.5 w-3.5" /> Copy Invitation
                  </Button>
                </h4>
                <a
                  href={activeMeeting.join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm break-all text-blue-600 hover:underline"
                >
                  {activeMeeting.join_url}
                </a>
              </div>
            </div>
            {activeMeeting.password && (
              <div className="flex items-start gap-3">
                <Key className="mt-0.5 h-5 w-5 text-gray-500" />
                <div>
                  <h4 className="flex items-center text-sm font-medium">
                    <span>Meeting Password</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-6 px-2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() =>
                        copyToClipboard(
                          activeMeeting.password!,
                          "Meeting Password",
                        )
                      }
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </h4>
                  <p className="font-mono text-sm text-gray-500">
                    {showPassword ? activeMeeting.password : "••••••••"}
                  </p>
                </div>
              </div>
            )}
            {(detailedMeeting?.isOrganizer ||
              session?.user?.role === "admin") &&
              hostKey && (
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div>
                    <h4 className="flex items-center text-sm font-medium">
                      <span>Host Key</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 px-2"
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
                        onClick={() => copyToClipboard(hostKey, "Host Key")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </h4>
                    <p className="font-mono text-sm text-gray-500">
                      {showHostKey ? hostKey : "••••••"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 italic">
                      Use this key to claim host controls in the meeting.
                    </p>
                  </div>
                </div>
              )}
          </TabsContent>
          <TabsContent value="summary" className="space-y-4 py-2">
            {loadingSummary ? (
              <p className="text-sm text-gray-500">Loading summary...</p>
            ) : meetingSummary ? (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold">
                    {meetingSummary.summary_title}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        `# ${meetingSummary.summary_title}\n\n${meetingSummary.summary_content}`,
                        "Meeting Summary",
                      )
                    }
                  >
                    <Clipboard className="mr-1 h-4 w-4" /> Copy
                  </Button>
                </div>
                <div className="text-xs text-gray-400">
                  Last updated:{" "}
                  {new Date(
                    meetingSummary.summary_last_modified_time,
                  ).toLocaleString("id-ID")}{" "}
                  by {meetingSummary.summary_last_modified_user_email}
                </div>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {meetingSummary.summary_content}
                  </ReactMarkdown>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                No meeting summary is available.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {status !== "past" && (
            <Button
              asChild
              className={
                status === "ongoing" ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              <a
                href={activeMeeting.join_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {status === "ongoing" ? "Join Now" : "Join Meeting"}
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
