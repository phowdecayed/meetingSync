import prisma from './prisma';
import axios from 'axios';
import jwt from 'jsonwebtoken';

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

// Fungsi untuk generate JWT token
async function generateJWT() {
  const creds = await getZoomCredentials();
  
  const payload = {
    iss: creds.apiKey,
    exp: Math.floor(Date.now() / 1000) + 3600, // Token berlaku 1 jam
  };
  
  const token = jwt.sign(payload, creds.apiSecret);
  return token;
}

// Fungsi untuk mendapatkan instance axios dengan headers yang diperlukan
async function getZoomApiClient() {
  const token = await generateJWT();
  
  return axios.create({
    baseURL: 'https://api.zoom.us/v2',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Fungsi untuk membuat meeting di Zoom
export async function createZoomMeeting(meetingData: {
  title: string;
  date: Date;
  duration: number;
  description?: string;
}) {
  try {
    const zoomClient = await getZoomApiClient();
    const creds = await getZoomCredentials();
    
    // Jika accountId tersedia, gunakan itu
    // Jika tidak, gunakan "me" yang merujuk ke user yang token-nya digunakan
    const userId = creds.accountId || 'me';
    
    const response = await zoomClient.post(`/users/${userId}/meetings`, {
      topic: meetingData.title,
      type: 2, // Scheduled meeting
      start_time: meetingData.date.toISOString(),
      duration: meetingData.duration,
      timezone: 'Asia/Jakarta',
      agenda: meetingData.description || '',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        auto_recording: 'none',
      },
    });
    
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
  }
) {
  try {
    const zoomClient = await getZoomApiClient();
    
    await zoomClient.patch(`/meetings/${zoomMeetingId}`, {
      topic: meetingData.title,
      type: 2, // Scheduled meeting
      start_time: meetingData.date.toISOString(),
      duration: meetingData.duration,
      timezone: 'Asia/Jakarta',
      agenda: meetingData.description || '',
    });
    
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
    const creds = await getZoomCredentials();
    
    // Jika accountId tersedia, gunakan itu
    // Jika tidak, gunakan "me" yang merujuk ke user yang token-nya digunakan
    const userId = creds.accountId || 'me';
    
    const params: any = {
      page_size: 300,
      type: 'scheduled',
    };
    
    if (nextPageToken) {
      params.next_page_token = nextPageToken;
    }
    
    const response = await zoomClient.get<ZoomMeetingsResponse>(`/users/${userId}/meetings`, { params });
    
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
export async function saveZoomCredentials(data: {
  apiKey: string;
  apiSecret: string;
  accountId?: string;
}) {
  try {
    await prisma.zoomCredentials.create({
      data: {
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        accountId: data.accountId,
      },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save Zoom credentials:', error);
    return { success: false };
  }
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