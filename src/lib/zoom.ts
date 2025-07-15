import prisma from './prisma'
import axios from 'axios'

// Jenis data untuk response dari Zoom API
interface ZoomMeeting {
  id: number
  topic: string
  type: number
  start_time: string
  duration: number
  timezone: string
  password: string
  agenda: string
  join_url: string
  start_url: string
}

interface ZoomMeetingsResponse {
  meetings: ZoomMeeting[]
  next_page_token?: string
}

// Interface for the Zoom OAuth token response
interface ZoomTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

// Interface for Zoom meeting settings
interface ZoomMeetingSettings {
  host_video?: boolean
  participant_video?: boolean
  join_before_host?: boolean
  mute_upon_entry?: boolean
  waiting_room?: boolean
  auto_recording?: 'local' | 'cloud' | 'none'
  approval_type?: 0 | 1 | 2
  audio?: 'both' | 'telephony' | 'voip'
  auto_start_meeting_summary?: boolean
  auto_start_ai_companion_questions?: boolean
}

// Interface for list meetings parameters
interface ListZoomMeetingsParams {
  page_size?: number
  type?: 'scheduled' | 'live' | 'upcoming'
  next_page_token?: string
}

// Fungsi untuk mendapatkan kredensial Zoom yang paling sedikit digunakan
export async function getBalancedZoomCredential() {
  const credentials = await prisma.zoomCredentials.findMany({
    include: {
      _count: {
        select: { meetings: true },
      },
    },
  })

  if (credentials.length === 0) {
    throw new Error(
      'Zoom credentials not found. Please set up Zoom integration first.',
    )
  }

  // Urutkan berdasarkan jumlah meeting
  credentials.sort((a, b) => a._count.meetings - b._count.meetings)

  // Cari kredensial dengan kurang dari 2 meeting
  const suitableCredential = credentials.find(
    (cred) => cred._count.meetings < 2,
  )

  // Jika tidak ada kredensial yang cocok, berarti semua sudah penuh
  if (!suitableCredential) {
    throw new Error(
      'All Zoom accounts are at maximum capacity (2 meetings). Please wait or add more credentials.',
    )
  }

  return suitableCredential
}

// Fungsi untuk memverifikasi kredensial S2S
export async function verifyS2SCredentials(
  clientId: string,
  clientSecret: string,
  accountId: string,
): Promise<ZoomTokenResponse> {
  try {
    const response = await axios.post<ZoomTokenResponse>(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: accountId,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )
    return response.data
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Error verifying S2S credentials:',
        error.response ? error.response.data : error.message,
      )
    } else {
      console.error('An unexpected error occurred:', error)
    }
    throw new Error('Could not verify Zoom S2S credentials.')
  }
}

// Fungsi untuk mendapatkan S2S access token untuk kredensial tertentu
export async function getS2SAccessToken(
  credential: Pick<
    Awaited<ReturnType<typeof getBalancedZoomCredential>>,
    'clientId' | 'clientSecret' | 'accountId' | 'id'
  >,
): Promise<{ accessToken: string; credentialId: string }> {
  try {
    const response = await axios.post<{ access_token: string }>(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: credential.accountId,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${credential.clientId}:${credential.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )
    return {
      accessToken: response.data.access_token,
      credentialId: credential.id,
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        `Error getting S2S access token for Client ID ${credential.clientId}:`,
        error.response ? error.response.data : error.message,
      )
    } else {
      console.error('An unexpected error occurred:', error)
    }
    throw new Error(
      `Could not fetch Zoom S2S access token for Client ID ${credential.clientId}.`,
    )
  }
}

// Fungsi untuk mendapatkan instance axios dengan headers yang diperlukan
export async function getZoomApiClient(
  credential: Pick<
    Awaited<ReturnType<typeof getBalancedZoomCredential>>,
    'clientId' | 'clientSecret' | 'accountId' | 'id'
  >,
) {
  const { accessToken, credentialId } = await getS2SAccessToken(credential)

  const apiClient = axios.create({
    baseURL: 'https://api.zoom.us/v2',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  return { apiClient, credentialId }
}

// Helper function to find the credential for a given meeting
export async function findCredentialForMeeting(zoomMeetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { zoomMeetingId },
    include: { zoomCredential: true },
  })

  if (!meeting?.zoomCredential) {
    throw new Error(
      `Could not find associated credentials for Zoom meeting ${zoomMeetingId}. The meeting may have been created by other means or the credential has been deleted.`,
    )
  }
  return meeting.zoomCredential
}

// Fungsi untuk membuat meeting di Zoom
export async function createZoomMeeting(
  meetingData: {
    topic: string
    start_time: string
    duration: number
    agenda?: string
    password?: string
    settings?: ZoomMeetingSettings
    timezone?: string
    type?: number
  },
  credential?: Awaited<ReturnType<typeof getBalancedZoomCredential>>,
) {
  try {
    const zoomCredential = credential ?? (await getBalancedZoomCredential())
    const { apiClient, credentialId } = await getZoomApiClient(zoomCredential)

    const userId = 'me'
    const payload = {
      topic: meetingData.topic,
      type: meetingData.type || 2,
      start_time: meetingData.start_time,
      duration: meetingData.duration,
      timezone: meetingData.timezone || 'Asia/Jakarta',
      agenda: meetingData.agenda || '',
      password: meetingData.password,
      pre_schedule: false,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: false,
        auto_recording: 'cloud' as const,
        approval_type: 2,
        audio: 'both' as const,
        auto_start_meeting_summary: true,
        auto_start_ai_companion_questions: true,
        ...meetingData.settings,
      },
    }

    const response = await apiClient.post(`/users/${userId}/meetings`, payload)

    return {
      zoomMeetingId: response.data.id.toString(),
      zoomJoinUrl: response.data.join_url,
      zoomStartUrl: response.data.start_url,
      zoomPassword: response.data.password,
      credentialId: credentialId,
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Failed to create Zoom meeting:',
        error.response?.data || error,
      )
    } else {
      console.error('An unexpected error occurred:', error)
    }
    throw new Error('Failed to create Zoom meeting')
  }
}

// Fungsi untuk memperbarui meeting di Zoom
export async function updateZoomMeeting(
  zoomMeetingId: string,
  meetingData: {
    title: string
    date: Date
    duration: number
    description?: string
    password?: string
  },
) {
  try {
    const credential = await findCredentialForMeeting(zoomMeetingId)
    const { apiClient } = await getZoomApiClient(credential)

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
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: false,
        auto_recording: 'cloud' as const,
        approval_type: 2,
        audio: 'both' as const,
        auto_start_meeting_summary: true,
        auto_start_ai_companion_questions: true,
      },
    }

    await apiClient.patch(`/meetings/${zoomMeetingId}`, updatePayload)

    // Dapatkan info meeting terbaru setelah diupdate
    const updatedMeeting = await apiClient.get(`/meetings/${zoomMeetingId}`)

    return {
      zoomMeetingId: updatedMeeting.data.id.toString(),
      zoomJoinUrl: updatedMeeting.data.join_url,
      zoomStartUrl: updatedMeeting.data.start_url,
      zoomPassword: updatedMeeting.data.password,
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Failed to update Zoom meeting:',
        error.response?.data || error,
      )
    } else {
      console.error('An unexpected error occurred:', error)
    }
    throw new Error('Failed to update Zoom meeting')
  }
}

/**
 * @description Menghapus meeting di Zoom
 * @param meetingId ID meeting Zoom
 */
export async function deleteZoomMeeting(meetingId: string) {
  try {
    const credential = await findCredentialForMeeting(meetingId)
    const { apiClient } = await getZoomApiClient(credential)
    // The DELETE request will throw an AxiosError for non-2xx responses
    await apiClient.delete(`/meetings/${meetingId}`)
  } catch (error) {
    // Re-throw the error to be handled by the caller
    throw error
  }
}

// Fungsi untuk mendapatkan semua meeting di semua akun Zoom
export async function listZoomMeetings() {
  const allMeetings: ZoomMeeting[] = []
  const credentials = await prisma.zoomCredentials.findMany()

  if (credentials.length === 0) {
    console.warn('No Zoom credentials found, returning empty meeting list.')
    return { meetings: [] }
  }

  try {
    for (const cred of credentials) {
      let next_page_token: string | undefined = undefined
      const { apiClient } = await getZoomApiClient(cred)
      const userId = 'me'

      do {
        const params: ListZoomMeetingsParams = {
          page_size: 300,
          type: 'scheduled',
          next_page_token,
        }

        try {
          const response = await apiClient.get<ZoomMeetingsResponse>(
            `/users/${userId}/meetings`,
            { params },
          )

          if (response.data.meetings) {
            allMeetings.push(...response.data.meetings)
          }
          next_page_token = response.data.next_page_token
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            // It's okay if a user has no meetings, just break the loop for this credential
            break
          }
          // For other errors, log it and continue to the next credential
          console.error(
            `Failed to list Zoom meetings for credential ${cred.clientId}:`,
            error,
          )
          break // Stop trying for this credential
        }
      } while (next_page_token)
    }

    // Find the last valid next_page_token from the loops
    let last_next_page_token: string | undefined = undefined
    for (const cred of credentials) {
      let next_page_token_cred: string | undefined = undefined
      const { apiClient } = await getZoomApiClient(cred)
      const userId = 'me'
      do {
        const params: ListZoomMeetingsParams = {
          page_size: 300,
          type: 'scheduled',
          next_page_token: next_page_token_cred,
        }
        try {
          const response = await apiClient.get<ZoomMeetingsResponse>(
            `/users/${userId}/meetings`,
            { params },
          )
          next_page_token_cred = response.data.next_page_token
          if (next_page_token_cred) {
            last_next_page_token = next_page_token_cred
          }
        } catch {
          break
        }
      } while (next_page_token_cred)
    }

    return {
      meetings: allMeetings,
      next_page_token: last_next_page_token,
    }
  } catch (error) {
    console.error(
      'An unexpected error occurred while listing all Zoom meetings:',
      error,
    )
    throw new Error('Failed to list all Zoom meetings')
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
    // Cek apakah kredensial dengan clientId yang sama sudah ada
    const existingCredential = await prisma.zoomCredentials.findFirst({
      where: { clientId },
    })

    if (existingCredential) {
      throw new Error('Kredensial Zoom dengan Client ID tersebut sudah ada.')
    }

    // Simpan kredensial baru
    const newCredentials = await prisma.zoomCredentials.create({
      data: {
        clientId,
        clientSecret, // Seharusnya dienkripsi di production
        accountId,
        hostKey,
      },
    })
    return newCredentials
  } catch (error) {
    console.error('Error saving Zoom credentials:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Could not save Zoom credentials.')
  }
}

// Fungsi untuk mendapatkan meeting Zoom berdasarkan ID
export async function getZoomMeeting(
  zoomMeetingId: string,
): Promise<ZoomMeeting> {
  try {
    const credential = await findCredentialForMeeting(zoomMeetingId)
    const { apiClient } = await getZoomApiClient(credential)
    const response = await apiClient.get<ZoomMeeting>(
      `/meetings/${zoomMeetingId}`,
    )

    return response.data
  } catch (error) {
    console.error('Failed to get Zoom meeting:', error)
    throw new Error('Failed to get Zoom meeting')
  }
}

// Function to get meeting UUID from numeric meeting ID
export async function getZoomMeetingUUID(
  meetingId: string | number,
): Promise<string> {
  try {
    const numericMeetingId = meetingId.toString()
    console.log('getZoomMeetingUUID called with meetingId:', numericMeetingId)

    const credential = await findCredentialForMeeting(numericMeetingId)
    const { apiClient } = await getZoomApiClient(credential)

    // Approach 3: Try the instances endpoint (original approach)
    console.log(
      'Using Zoom Headers:',
      JSON.stringify(apiClient.defaults.headers.common, null, 2),
    )
    console.log('Trying to get UUID from instances...')
    const instancesResponse = await apiClient.get<{
      meetings: { uuid: string }[]
    }>(`/past_meetings/${numericMeetingId}/instances`)
    const meetings = instancesResponse.data.meetings

    console.log(
      'Instances response:',
      JSON.stringify(instancesResponse.data, null, 2),
    )

    if (meetings && Array.isArray(meetings) && meetings.length > 0) {
      console.log('Found UUID from instances:', meetings[0].uuid)
      return meetings[0].uuid
    }

    throw new Error('Could not find any meeting instances or UUID')
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Failed to get Zoom meeting UUID:',
        error.response?.data || error,
      )
    } else {
      console.error('An unexpected error occurred:', error)
    }
    throw new Error('Failed to get Zoom meeting UUID')
  }
}

// Fungsi untuk double-encode UUID sesuai aturan Zoom
export function encodeMeetingUUID(uuid: string) {
  if (uuid.startsWith('/') || uuid.includes('//')) {
    return encodeURIComponent(encodeURIComponent(uuid))
  }
  return encodeURIComponent(uuid)
}

// Interface for Zoom meeting summary response
export interface ZoomMeetingSummary {
  meeting_host_id: string
  meeting_host_email: string
  meeting_uuid: string
  meeting_id: number
  meeting_topic: string
  meeting_start_time: string
  meeting_end_time: string
  summary_start_time: string
  summary_end_time: string
  summary_created_time: string
  summary_last_modified_time: string
  summary_last_modified_user_id: string
  summary_last_modified_user_email: string
  summary_title: string
  summary_content: string
}

// Fungsi untuk mengambil meeting summary dari Zoom API
export async function getZoomMeetingSummary(
  meetingIdentifier: string,
): Promise<ZoomMeetingSummary> {
  try {
    console.log(
      'getZoomMeetingSummary called with identifier:',
      meetingIdentifier,
    )

    // Check if the identifier is a numeric ID or UUID
    let meetingUUID = meetingIdentifier
    const numericMeetingId = meetingIdentifier

    // If it looks like a numeric ID (no special characters), get the UUID first
    if (/^\d+$/.test(meetingIdentifier)) {
      console.log('Identifier is numeric, getting UUID from meeting ID')
      meetingUUID = await getZoomMeetingUUID(meetingIdentifier)
      console.log('Got UUID from meeting ID:', meetingUUID)
    } else {
      // If we have a UUID, we need to find the numeric ID to find the credential
      // This block is problematic if we only have a UUID. The schema would need to store it.
      // Assuming for now the identifier will be the numeric ID.
    }

    const credential = await findCredentialForMeeting(numericMeetingId)
    const { apiClient } = await getZoomApiClient(credential)

    const encodedUUID = encodeMeetingUUID(meetingUUID)
    console.log('Encoded UUID:', encodedUUID)
    console.log(
      'Making API call to:',
      `/meetings/${encodedUUID}/meeting_summary`,
    )

    const response = await apiClient.get<ZoomMeetingSummary>(
      `/meetings/${encodedUUID}/meeting_summary`,
    )
    return response.data
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Failed to get Zoom meeting summary:',
        error.response?.data || error,
      )
    } else {
      console.error('An unexpected error occurred:', error)
    }
    throw new Error('Failed to get Zoom meeting summary')
  }
}
