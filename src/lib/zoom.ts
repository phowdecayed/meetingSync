import prisma from './prisma';
import axios from 'axios';


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

// Fungsi untuk mendapatkan credentials Zoom
async function getZoomCredentials() {
  const creds = await prisma.zoomCredentials.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  if (!creds) {
    throw new Error('Zoom credentials not found. Please set up Zoom integration first.');
  }
  
  return creds;
}

// Fungsi untuk memverifikasi kredensial S2S
export async function verifyS2SCredentials(clientId: string, clientSecret: string, accountId: string): Promise<any> {
  try {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: accountId,
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error verifying S2S credentials:', error.response ? error.response.data : error.message);
    throw new Error('Could not verify Zoom S2S credentials.');
  }
}

// Fungsi untuk mendapatkan S2S access token (menggunakan kredensial dari DB)
export async function getS2SAccessToken() {
  const creds = await getZoomCredentials();
  
  try {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: creds.accountId,
      }),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.access_token;
  } catch (error: any) {
    console.error('Error getting S2S access token:', error.response ? error.response.data : error.message);
    throw new Error('Could not fetch Zoom S2S access token.');
  }
}

// Fungsi untuk mendapatkan instance axios dengan headers yang diperlukan
async function getZoomApiClient() {
  const accessToken = await getS2SAccessToken();
  
  return axios.create({
    baseURL: 'https://api.zoom.us/v2',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
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
  settings?: any;
  timezone?: string;
  type?: number;
}) {
  try {
    const zoomClient = await getZoomApiClient();

    // Use 'me' as userId to create the meeting as the authenticated user
    // This is more reliable than using accountId which might not be a user ID
    const userId = 'me';

    // Format payload based on the Zoom API requirements
    const payload = {
      topic: meetingData.topic,
      type: meetingData.type || 2, // Scheduled meeting (2 = scheduled)
      start_time: meetingData.start_time,
      duration: meetingData.duration,
      timezone: meetingData.timezone || 'Asia/Jakarta',
      agenda: meetingData.agenda || '',
      password: meetingData.password,
      pre_schedule: false,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        auto_recording: 'none',
        approval_type: 2,
        registration_type: 1,
        audio: 'both',
        close_registration: false,
        alternative_hosts_email_notification: true,
        contact_name: "BPKAD Jabar",
        contact_email: "bpkad@jabarprov.go.id",
        email_notification: true,
        ...meetingData.settings,
      },
    };

    const response = await zoomClient.post(`/users/${userId}/meetings`, payload);
    
    return {
      zoomMeetingId: response.data.id.toString(),
      zoomJoinUrl: response.data.join_url,
      zoomStartUrl: response.data.start_url,
      zoomPassword: response.data.password,
    };
  } catch (error: any) {
    console.error('Failed to create Zoom meeting:', error.response?.data || error);
    throw new Error('Failed to create Zoom meeting');
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
  }
) {
  try {
    const zoomClient = await getZoomApiClient();
    
    // Format update payload based on Zoom API requirements
    const updatePayload = {
      topic: meetingData.title,
      type: 2, // Scheduled meeting
      start_time: meetingData.date.toISOString(),
      duration: meetingData.duration,
      timezone: 'Asia/Jakarta',
      agenda: meetingData.description || '',
      password: meetingData.password,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        auto_recording: 'none',
      }
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
  } catch (error: any) {
    console.error('Failed to update Zoom meeting:', error.response?.data || error);
    throw new Error('Failed to update Zoom meeting');
  }
}

// Fungsi untuk menghapus meeting di Zoom
export async function deleteZoomMeeting(zoomMeetingId: string) {
  try {
    const zoomClient = await getZoomApiClient();
    await zoomClient.delete(`/meetings/${zoomMeetingId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete Zoom meeting:', error);
    return { success: false };
  }
}

// Fungsi untuk mendapatkan semua meeting di Zoom
export async function listZoomMeetings(nextPageToken?: string) {
  try {
    const zoomClient = await getZoomApiClient();
    
    // Use 'me' as userId to list meetings for the authenticated user
    const userId = 'me';
    
    const params: any = {
      page_size: 300,
      type: 'scheduled',
    };
    
    if (nextPageToken) {
      params.next_page_token = nextPageToken;
    }
    
    const response = await zoomClient.get<ZoomMeetingsResponse>(`/users/${userId}/meetings`, { params });
    
    // Return meetings with all properties including password
    return {
      meetings: response.data.meetings,
      nextPageToken: response.data.next_page_token,
    };
  } catch (error) {
    console.error('Failed to list Zoom meetings:', error);
    throw new Error('Failed to list Zoom meetings');
  }
}

// Fungsi untuk menyimpan kredensial Zoom
export async function saveZoomCredentials(
  clientId: string, 
  clientSecret: string, 
  accountId: string, 
  hostKey?: string
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
    console.error('Error saving Zoom credentials:', error);
    throw new Error('Could not save Zoom credentials.');
  }
}


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

// Fungsi untuk mendapatkan meeting Zoom berdasarkan ID
export async function getZoomMeeting(zoomMeetingId: string) {
  try {
    const zoomClient = await getZoomApiClient();
    const response = await zoomClient.get(`/meetings/${zoomMeetingId}`);
    
    return response.data;
  } catch (error) {
    console.error('Failed to get Zoom meeting:', error);
    throw new Error('Failed to get Zoom meeting');
  }
}