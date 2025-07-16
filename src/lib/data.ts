import bcrypt from 'bcryptjs'
import prisma from './prisma'
import {
  createZoomMeeting,
  updateZoomMeeting,
  deleteZoomMeeting,
  getBalancedZoomCredential,
} from './zoom'
import { format } from 'date-fns'
import { Prisma } from '@prisma/client'

// --- SHARED TYPES & UTILS ---
export type Meeting = {
  id: string
  title: string
  date: Date
  duration: number // in minutes
  participants: string[]
  description?: string
  password?: string // Password for Zoom meeting
  organizerId: string
  zoomMeetingId?: string
  zoomJoinUrl?: string
  zoomStartUrl?: string
  zoomPassword?: string
}

export type User = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
}

// Tipe dari skema Prisma
type PrismaMeeting = {
  id: string
  title: string
  date: Date
  duration: number
  participants: string
  description: string | null
  organizerId: string
  zoomMeetingId: string | null
  zoomJoinUrl: string | null
  zoomStartUrl: string | null
  zoomPassword: string | null
}

type PrismaUser = {
  id: string
  email: string
  name: string
  role: string
  passwordHash: string | null
  createdAt: Date
}

// Add password for user creation and verification
export type FullUser = User & { password?: string }

// Helper function to format Meeting data
const formatMeeting = (meeting: PrismaMeeting): Meeting => {
  return {
    ...meeting,
    participants: meeting.participants.split(',').map((p: string) => p.trim()),
    description: meeting.description || undefined,
    zoomMeetingId: meeting.zoomMeetingId || undefined,
    zoomJoinUrl: meeting.zoomJoinUrl || undefined,
    zoomStartUrl: meeting.zoomStartUrl || undefined,
    zoomPassword: meeting.zoomPassword || undefined,
  }
}

// Helper function to format User data
export const formatUser = (user: PrismaUser): User => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as 'admin' | 'member',
  }
}

export const getMeetings = async (
  user?: {
    id: string
    email?: string | null
    role: string
  },
  fromDate?: Date,
): Promise<Meeting[]> => {
  if (!user) {
    return []
  }

  const whereConditions: Prisma.MeetingWhereInput = {}

  if (fromDate) {
    whereConditions.date = {
      gte: fromDate,
    }
  }

  if (user.role !== 'admin') {
    whereConditions.OR = [
      { organizerId: user.id },
      {
        participants: {
          contains: user.email ?? 'unlikely-string-to-avoid-error',
        },
      },
    ]
  }

  const meetings = await prisma.meeting.findMany({
    where: whereConditions,
    orderBy: {
      date: 'asc',
    },
  })
  return meetings.map(formatMeeting)
}

export const getMeetingById = async (
  id: string,
): Promise<Meeting | undefined> => {
  const meeting = await prisma.meeting.findUnique({
    where: { id },
  })
  return meeting ? formatMeeting(meeting) : undefined
}

export const createMeeting = async (
  data: Omit<Meeting, 'id'>,
): Promise<Meeting> => {
  try {
    // 1. Get the least busy credential first.
    const credential = await getBalancedZoomCredential()

    // If no credential is available (all are at capacity), stop the process.
    if (!credential) {
      throw new Error(
        'CAPACITY_FULL:All Zoom accounts are at maximum capacity (2 meetings). Please wait or add more credentials.',
      )
    }

    // 2. Check for overlaps on the specific credential that will be used.
    const meetingDate =
      data.date instanceof Date ? data.date : new Date(data.date)
    const newStart = meetingDate
    const newEnd = new Date(meetingDate.getTime() + data.duration * 60 * 1000)

    const startOfDay = new Date(newStart)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(newStart)
    endOfDay.setHours(23, 59, 59, 999)

    const meetingsOnDay = await prisma.meeting.findMany({
      where: {
        // Only check meetings on the same credential
        zoomCredentialId: credential.id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    const overlapCount = meetingsOnDay.reduce(
      (count: number, m: PrismaMeeting) => {
        const existingStart = new Date(m.date)
        const existingEnd = new Date(
          existingStart.getTime() + m.duration * 60 * 1000,
        )
        return newStart < existingEnd && newEnd > existingStart
          ? count + 1
          : count
      },
      0,
    )

    if (overlapCount >= 2) {
      throw new Error(
        `The selected Zoom account (Client ID: ${credential.clientId}) is already at its maximum capacity of 2 concurrent meetings for this timeslot.`,
      )
    }

    // 3. Create the Zoom meeting using the selected credential
    const startTimeJakarta = format(meetingDate, "yyyy-MM-dd'T'HH:mm:ss")
    const zoomMeetingData = await createZoomMeeting(
      {
        topic: data.title,
        start_time: startTimeJakarta,
        duration: data.duration,
        agenda: data.description,
        password: data.password || 'rahasia',
        type: 2,
        timezone: 'Asia/Jakarta',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
          auto_recording: 'cloud',
          approval_type: 2,
          audio: 'both',
        },
      },
      credential, // Pass the chosen credential
    )

    // 4. Create the meeting in our database
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        date: meetingDate,
        duration: data.duration,
        participants: Array.isArray(data.participants)
          ? data.participants.join(', ')
          : data.participants,
        description: data.description || '',
        organizerId: data.organizerId,
        zoomMeetingId: zoomMeetingData.zoomMeetingId,
        zoomJoinUrl: zoomMeetingData.zoomJoinUrl,
        zoomStartUrl: zoomMeetingData.zoomStartUrl,
        zoomPassword: zoomMeetingData.zoomPassword,
        zoomCredentialId: zoomMeetingData.credentialId, // Link the meeting to the credential
      },
    })

    return formatMeeting(meeting)
  } catch (error) {
    console.error('Failed to create meeting:', error)
    if (error instanceof Error) {
      // Re-throw the original error to be handled by the API route
      throw error
    }
    throw new Error('An unknown error occurred during meeting creation.')
  }
}

export const updateMeeting = async (
  id: string,
  data: Partial<Omit<Meeting, 'id'>>,
): Promise<Meeting> => {
  try {
    const currentMeeting = await prisma.meeting.findUnique({ where: { id } })
    if (!currentMeeting) {
      throw new Error('Meeting not found')
    }

    let zoomData = {}

    if (currentMeeting.zoomMeetingId) {
      const meetingDate = data.date
        ? data.date instanceof Date
          ? data.date
          : new Date(data.date)
        : currentMeeting.date

      const updatedZoomMeeting = await updateZoomMeeting(
        currentMeeting.zoomMeetingId,
        {
          title: data.title || currentMeeting.title,
          date: meetingDate,
          duration: data.duration || currentMeeting.duration,
          description:
            data.description !== undefined
              ? data.description
              : currentMeeting.description || '',
          password:
            data.password !== undefined
              ? data.password
              : currentMeeting.zoomPassword || '',
        },
      )

      zoomData = {
        zoomMeetingId: updatedZoomMeeting.zoomMeetingId,
        zoomJoinUrl: updatedZoomMeeting.zoomJoinUrl,
        zoomStartUrl: updatedZoomMeeting.zoomStartUrl,
        zoomPassword: updatedZoomMeeting.zoomPassword,
      }
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.date && {
          date:
            data.date instanceof Date
              ? data.date
              : new Date(data.date as string),
        }),
        ...(data.duration && { duration: data.duration }),
        ...(data.participants && {
          participants: Array.isArray(data.participants)
            ? data.participants.join(', ')
            : data.participants,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.password !== undefined && { password: data.password }),
        ...(data.organizerId && { organizerId: data.organizerId }),
        ...zoomData,
      },
    })

    return formatMeeting(meeting)
  } catch (error) {
    console.error('Failed to update meeting with Zoom integration:', error)
    throw new Error('Failed to update meeting with Zoom integration')
  }
}

export const deleteMeeting = async (
  id: string,
): Promise<{ success: boolean }> => {
  // Get the meeting first to find its associated Zoom ID
  const meeting = await prisma.meeting.findUnique({ where: { id } })

  // If the meeting has a Zoom ID, we must delete it from Zoom first.
  if (meeting && meeting.zoomMeetingId) {
    try {
      // Attempt to delete from Zoom. If this fails, it will throw an error
      // and the function will exit, preventing the local DB deletion.
      await deleteZoomMeeting(meeting.zoomMeetingId)
    } catch (error) {
      console.error(
        `Failed to delete Zoom meeting ${meeting.zoomMeetingId}:`,
        error,
      )
      // Re-throw the error to be handled by the API route, and indicate failure.
      throw new Error(
        `Failed to delete the meeting from Zoom. Local database record was not deleted.`,
      )
    }
  }

  // If there was no Zoom meeting or the Zoom deletion was successful, delete from our database.
  await prisma.meeting.delete({
    where: { id },
  })

  return { success: true }
}

export const deleteDbMeeting = async (id: string): Promise<void> => {
  try {
    await prisma.meeting.delete({ where: { id } })
  } catch (error) {
    console.error(`Failed to delete meeting ${id} from database:`, error)
    throw new Error('Database deletion failed.')
  }
}

export const getUsers = async (options?: {
  page?: number
  perPage?: number
  query?: string
}): Promise<{ users: User[]; total: number }> => {
  const page = options?.page || 1
  const perPage = options?.perPage || 10
  const query = options?.query || ''
  const skip = (page - 1) * perPage

  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: perPage,
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    users: users.map((user: PrismaUser) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'member',
    })),
    total,
  }
}

export const getUsersByIds = async (ids: string[]): Promise<User[]> => {
  if (ids.length === 0) return []
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: ids,
      },
    },
  })
  return users.map((user: PrismaUser) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as 'admin' | 'member',
  }))
}

export const createUser = async (data: {
  name: string
  email: string
  role: 'admin' | 'member'
  password?: string
}): Promise<User> => {
  if (!data.password) throw new Error('Password is required.')

  const passwordHash = await bcrypt.hash(data.password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash,
      },
    })

    return formatUser({ ...user, createdAt: new Date() })
  } catch {
    throw new Error('A user with this email already exists.')
  }
}

export const updateUserRole = async (
  id: string,
  role: 'admin' | 'member',
): Promise<User> => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role },
    })

    return formatUser({ ...user, createdAt: new Date() })
  } catch {
    throw new Error('User not found')
  }
}

export const deleteUserById = async (
  id: string,
): Promise<{ success: boolean }> => {
  try {
    await prisma.user.delete({
      where: { id },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  return user ? formatUser({ ...user, createdAt: new Date() }) : null
}

export const updateAuthUser = async (
  id: string,
  data: { name: string },
): Promise<User> => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { name: data.name },
    })

    return formatUser({ ...user, createdAt: new Date() })
  } catch {
    throw new Error('User not found')
  }
}

export const getAdminDashboardStats = async () => {
  const [totalUsers, totalMeetings, connectedZoomAccounts] = await Promise.all([
    prisma.user.count(),
    prisma.meeting.count(),
    prisma.zoomCredentials.count(),
  ])

  const mostActiveUsersData = await prisma.meeting.groupBy({
    by: ['organizerId'],
    _count: {
      organizerId: true,
    },
    orderBy: {
      _count: {
        organizerId: 'desc',
      },
    },
    take: 4,
  })

  const userIds = mostActiveUsersData.map(
    (u: { organizerId: string }) => u.organizerId,
  )
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
  })
  const userMap = new Map(users.map((u: PrismaUser) => [u.id, u]))

  const mostActiveUsers = mostActiveUsersData.map(
    (u: { organizerId: string; _count: { organizerId: number } }) => ({
      ...(userMap.get(u.organizerId) as User),
      meetingCount: u._count.organizerId,
    }),
  )

  const nextSevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  const meetingsPerDay = await Promise.all(
    nextSevenDays.map(async (day) => {
      const startOfDay = new Date(day.setHours(0, 0, 0, 0))
      const endOfDay = new Date(day.setHours(23, 59, 59, 999))
      const count = await prisma.meeting.count({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })
      return {
        date: format(startOfDay, 'EEE'),
        count,
      }
    }),
  )

  return {
    totalUsers,
    totalMeetings,
    connectedZoomAccounts,
    mostActiveUsers,
    meetingsPerDay,
  }
}

export const verifyUserCredentials = async (
  email: string,
  pass: string,
): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.passwordHash) return null

  const passwordsMatch = await bcrypt.compare(pass, user.passwordHash)
  if (!passwordsMatch) return null

  return formatUser({ ...user, createdAt: new Date() })
}
