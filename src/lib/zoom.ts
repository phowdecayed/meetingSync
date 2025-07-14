import prisma from "./prisma";
import axios from "axios";

// Jenis data untuk response dari Zoom API
interface ZoomMeeting {
  id: number;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  password: string;
  agenda: string;
  join_url: string;
  start_url: string;
}

interface ZoomMeetingsResponse {
  meetings: ZoomMeeting[];
  next_page_token?: string;
}

// Interface for the Zoom OAuth token response
interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Interface for Zoom meeting settings
interface ZoomMeetingSettings {
  host_video?: boolean;
  participant_video?: boolean;
  join_before_host?: boolean;
  mute_upon_entry?: boolean;
  waiting_room?: boolean;
  auto_recording?: "local" | "cloud" | "none";
  approval_type?: 0 | 1 | 2;
  audio?: "both" | "telephony" | "voip";
  auto_start_meeting_summary?: boolean;
  auto_start_ai_companion_questions?: boolean;
}

// Interface for list meetings parameters
interface ListZoomMeetingsParams {
  page_size?: number;
  type?: "scheduled" | "live" | "upcoming";
  next_page_token?: string;
}

// Fungsi untuk mendapatkan credentials Zoom
async function getZoomCredentials() {
  const creds = await prisma.zoomCredentials.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!creds) {
    throw new Error(
      "Zoom credentials not found. Please set up Zoom integration first.",
    );
  }

  return creds;
}

// Fungsi untuk memverifikasi kredensial S2S
export async function verifyS2SCredentials(
  clientId: string,
  clientSecret: string,
  accountId: string,
): Promise<ZoomTokenResponse> {
  try {
    const response = await axios.post<ZoomTokenResponse>(
      "https://zoom.us/oauth/token",
      new URLSearchParams({
        grant_type: "account_credentials",
        account_id: accountId,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error verifying S2S credentials:",
        error.response ? error.response.data : error.message,
      );
    } else {
      console.error("An unexpected error occurred:", error);
    }
    throw new Error("Could not verify Zoom S2S credentials.");
  }
}

// Fungsi untuk mendapatkan S2S access token (menggunakan kredensial dari DB)
export async function getS2SAccessToken(): Promise<string> {
  const creds = await getZoomCredentials();

  try {
    const response = await axios.post<{ access_token: string }>(
      "https://zoom.us/oauth/token",
      new URLSearchParams({
        grant_type: "account_credentials",
        account_id: creds.accountId,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    return response.data.access_token;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error getting S2S access token:",
        error.response ? error.response.data : error.message,
      );
    } else {
      console.error("An unexpected error occurred:", error);
    }
    throw new Error("Could not fetch Zoom S2S access token.");
  }
}

// Fungsi untuk mendapatkan instance axios dengan headers yang diperlukan
export async function getZoomApiClient() {
  const accessToken = await getS2SAccessToken();

  return axios.create({
    baseURL: "https://api.zoom.us/v2",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

// Fungsi untuk membuat meeting di Zoom
export async function createZoomMeeting(meetingData: {
  topic: string;
  start_time: string;
  duration: number;
  agenda?: string;
  password?: string;
  settings?: ZoomMeetingSettings;
  timezone?: string;
  type?: number;
}) {
  try {
    const zoomClient = await getZoomApiClient();

    // Use 'me' as userId to create the meeting as the authenticated user
    // This is more reliable than using accountId which might not be a user ID
    const userId = "me";

    // Format payload based on the Zoom API requirements
    const payload = {
      topic: meetingData.topic,
      type: meetingData.type || 2, // Scheduled meeting (2 = scheduled)
      start_time: meetingData.start_time,
      duration: meetingData.duration,
      timezone: meetingData.timezone || "Asia/Jakarta",
      agenda: meetingData.agenda || "",
      password: meetingData.password,
      pre_schedule: false,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: false,
        auto_recording: "cloud" as const,
        approval_type: 2,
        audio: "both" as const,
        auto_start_meeting_summary: true,
        auto_start_ai_companion_questions: true,
        ...meetingData.settings,
      },
    };

    const response = await zoomClient.post(
      `/users/${userId}/meetings`,
      payload,
    );

    return {
      zoomMeetingId: response.data.id.toString(),
      zoomJoinUrl: response.data.join_url,
      zoomStartUrl: response.data.start_url,
      zoomPassword: response.data.password,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Failed to create Zoom meeting:",
        error.response?.data || error,
      );
    } else {
      console.error("An unexpected error occurred:", error);
    }
    throw new Error("Failed to create Zoom meeting");
  }
}

// Fungsi untuk memperbarui meeting di Zoom
export async function updateZoomMeeting(
  zoomMeetingId: string,
  meetingData: {
    title: string;
    date: Date;
    duration: number;
    description?: string;
    password?: string;
  },
) {
  try {
    const zoomClient = await getZoomApiClient();

    // Format update payload based on Zoom API requirements
    const updatePayload = {
      topic: meetingData.title,
      type: 2, // Scheduled meeting
      start_time: meetingData.date.toISOString(),
      duration: meetingData.duration,
      timezone: "Asia/Jakarta",
      agenda: meetingData.description || "",
      password: meetingData.password,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: false,
        auto_recording: "cloud" as const,
        approval_type: 2,
        audio: "both" as const,
        auto_start_meeting_summary: true,
        auto_start_ai_companion_questions: true,
      },
    };

    await zoomClient.patch(`/meetings/${zoomMeetingId}`, updatePayload);

    // Dapatkan info meeting terbaru setelah diupdate
    const updatedMeeting = await zoomClient.get(`/meetings/${zoomMeetingId}`);

    return {
      zoomMeetingId: updatedMeeting.data.id.toString(),
      zoomJoinUrl: updatedMeeting.data.join_url,
      zoomStartUrl: updatedMeeting.data.start_url,
      zoomPassword: updatedMeeting.data.password,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Failed to update Zoom meeting:",
        error.response?.data || error,
      );
    } else {
      console.error("An unexpected error occurred:", error);
    }
    throw new Error("Failed to update Zoom meeting");
  }
}

/**
 * @description Menghapus meeting di Zoom
 * @param meetingId ID meeting Zoom
 */
export async function deleteZoomMeeting(meetingId: string) {
  try {
    const zoomClient = await getZoomApiClient();
    // The DELETE request will throw an AxiosError for non-2xx responses
    await zoomClient.delete(`/meetings/${meetingId}`);
  } catch (error) {
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

// Fungsi untuk mendapatkan semua meeting di Zoom
export async function listZoomMeetings(nextPageToken?: string) {
  try {
    const zoomClient = await getZoomApiClient();

    // Use 'me' as userId to list meetings for the authenticated user
    const userId = "me";

    const params: ListZoomMeetingsParams = {
      page_size: 300,
      type: "scheduled",
    };

    if (nextPageToken) {
      params.next_page_token = nextPageToken;
    }

    const response = await zoomClient.get<ZoomMeetingsResponse>(
      `/users/${userId}/meetings`,
      { params },
    );

    // Return meetings with all properties including password
    return {
      meetings: response.data.meetings,
      nextPageToken: response.data.next_page_token,
    };
  } catch (error) {
    console.error("Failed to list Zoom meetings:", error);
    throw new Error("Failed to list Zoom meetings");
  }
}

// Fungsi untuk menyimpan kredensial Zoom
export async function saveZoomCredentials(
  clientId: string,
  clientSecret: string,
  accountId: string,
  hostKey?: string,
) {
  try {
    // Hapus kredensial lama jika ada
    await prisma.zoomCredentials.deleteMany({});

    // Simpan kredensial baru
    const newCredentials = await prisma.zoomCredentials.create({
      data: {
        clientId,
        clientSecret, // Seharusnya dienkripsi di production
        accountId,
        hostKey,
      },
    });
    return newCredentials;
  } catch (error) {
    console.error("Error saving Zoom credentials:", error);
    throw new Error("Could not save Zoom credentials.");
  }
}

// Fungsi untuk mendapatkan meeting Zoom berdasarkan ID
export async function getZoomMeeting(
  zoomMeetingId: string,
): Promise<ZoomMeeting> {
  try {
    const zoomClient = await getZoomApiClient();
    const response = await zoomClient.get<ZoomMeeting>(
      `/meetings/${zoomMeetingId}`,
    );

    return response.data;
  } catch (error) {
    console.error("Failed to get Zoom meeting:", error);
    throw new Error("Failed to get Zoom meeting");
  }
}

// Function to get meeting UUID from numeric meeting ID
export async function getZoomMeetingUUID(
  meetingId: string | number,
): Promise<string> {
  try {
    console.log("getZoomMeetingUUID called with meetingId:", meetingId);
    const zoomClient = await getZoomApiClient();

    // Approach 3: Try the instances endpoint (original approach)
    console.log(
      "Using Zoom Headers:",
      JSON.stringify(zoomClient.defaults.headers.common, null, 2),
    );
    console.log("Trying to get UUID from instances...");
    const instancesResponse = await zoomClient.get<{
      meetings: { uuid: string }[];
    }>(`/past_meetings/${meetingId}/instances`);
    const meetings = instancesResponse.data.meetings;

    console.log(
      "Instances response:",
      JSON.stringify(instancesResponse.data, null, 2),
    );

    if (meetings && Array.isArray(meetings) && meetings.length > 0) {
      console.log("Found UUID from instances:", meetings[0].uuid);
      return meetings[0].uuid;
    }

    throw new Error("Could not find any meeting instances or UUID");
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Failed to get Zoom meeting UUID:",
        error.response?.data || error,
      );
    } else {
      console.error("An unexpected error occurred:", error);
    }
    throw new Error("Failed to get Zoom meeting UUID");
  }
}

// Fungsi untuk double-encode UUID sesuai aturan Zoom
export function encodeMeetingUUID(uuid: string) {
  if (uuid.startsWith("/") || uuid.includes("//")) {
    return encodeURIComponent(encodeURIComponent(uuid));
  }
  return encodeURIComponent(uuid);
}

// Interface for Zoom meeting summary response
export interface ZoomMeetingSummary {
  meeting_host_id: string;
  meeting_host_email: string;
  meeting_uuid: string;
  meeting_id: number;
  meeting_topic: string;
  meeting_start_time: string;
  meeting_end_time: string;
  summary_start_time: string;
  summary_end_time: string;
  summary_created_time: string;
  summary_last_modified_time: string;
  summary_last_modified_user_id: string;
  summary_last_modified_user_email: string;
  summary_title: string;
  summary_content: string;
}

// Fungsi untuk mengambil meeting summary dari Zoom API
export async function getZoomMeetingSummary(
  meetingIdentifier: string,
): Promise<ZoomMeetingSummary> {
  try {
    console.log(
      "getZoomMeetingSummary called with identifier:",
      meetingIdentifier,
    );
    const zoomClient = await getZoomApiClient();

    // Check if the identifier is a numeric ID or UUID
    let meetingUUID = meetingIdentifier;

    // If it looks like a numeric ID (no special characters), get the UUID first
    if (/^\d+$/.test(meetingIdentifier)) {
      console.log("Identifier is numeric, getting UUID from meeting ID");
      meetingUUID = await getZoomMeetingUUID(meetingIdentifier);
      console.log("Got UUID from meeting ID:", meetingUUID);
    } else {
      console.log("Identifier appears to be a UUID, using directly");
    }

    const encodedUUID = encodeMeetingUUID(meetingUUID);
    console.log("Encoded UUID:", encodedUUID);
    console.log(
      "Making API call to:",
      `/meetings/${encodedUUID}/meeting_summary`,
    );

    const response = await zoomClient.get<ZoomMeetingSummary>(
      `/meetings/${encodedUUID}/meeting_summary`,
    );
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Failed to get Zoom meeting summary:",
        error.response?.data || error,
      );
    } else {
      console.error("An unexpected error occurred:", error);
    }
    throw new Error("Failed to get Zoom meeting summary");
  }
}
