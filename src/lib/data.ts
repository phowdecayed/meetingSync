import bcrypt from 'bcryptjs'
import prisma from './prisma'
import {
  createZoomMeeting,
  updateZoomMeeting,
  deleteZoomMeeting,
  getBalancedZoomCredential,
} from './zoom'
import { format } from 'date-fns'
import {
  Prisma,
  Meeting as PrismaMeeting,
  User as PrismaUser,
  MeetingRoom,
} from '@prisma/client'

export type { MeetingRoom }

// --- SHARED TYPES & UTILS ---
export type Meeting = Omit<PrismaMeeting, 'participants' | 'meetingType'> & {
  participants: string
  meetingType: 'internal' | 'external'
}

export type User = Omit<PrismaUser, 'role'> & {
  role: 'admin' | 'member'
}

// Add password for user creation and verification
export type FullUser = User & { password?: string }

// Helper function to format Meeting data
const formatMeeting = (meeting: PrismaMeeting): Meeting => {
  return {
    ...meeting,
    participants: meeting.participants,
    meetingType: meeting.meetingType as 'internal' | 'external',
  }
}

// Helper function to format User data
export const formatUser = (user: PrismaUser): User => {
  return {
    ...user,
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
    include: {
      meetingRoom: true,
      organizer: true,
    },
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

export const getMeetingRooms = async (): Promise<MeetingRoom[]> => {
  try {
    const rooms = await prisma.meetingRoom.findMany({
      orderBy: {
        name: 'asc',
      },
    })
    return rooms
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error(
        'Failed to connect to the database. Returning empty array for meeting rooms.',
      )
      return []
    }
    throw error
  }
}

export const createMeetingRoom = async (
  data: Omit<MeetingRoom, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
): Promise<MeetingRoom> => {
  const room = await prisma.meetingRoom.create({
    data,
  })
  return room
}

export const updateMeetingRoom = async (
  id: string,
  data: Partial<Omit<MeetingRoom, 'id'>>,
): Promise<MeetingRoom> => {
  const room = await prisma.meetingRoom.update({
    where: { id },
    data,
  })
  return room
}

export const deleteMeetingRoom = async (id: string): Promise<void> => {
  await prisma.meetingRoom.delete({
    where: { id },
  })
}

export const createMeeting = async (
  data: Omit<Meeting, 'id'>,
): Promise<Meeting> => {
  try {
    let zoomMeetingData = null
    if (data.isZoomMeeting) {
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

      const overlapCount = meetingsOnDay.reduce((count, m) => {
        const existingStart = new Date(m.date)
        const existingEnd = new Date(
          existingStart.getTime() + m.duration * 60 * 1000,
        )
        return newStart < existingEnd && newEnd > existingStart
          ? count + 1
          : count
      }, 0)

      if (overlapCount >= 2) {
        throw new Error(
          `The selected Zoom account (Client ID: ${credential.clientId}) is already at its maximum capacity of 2 concurrent meetings for this timeslot.`,
        )
      }

      // 3. Create the Zoom meeting using the selected credential
      const startTimeJakarta = format(meetingDate, "yyyy-MM-dd'T'HH:mm:ss")
      zoomMeetingData = await createZoomMeeting(
        {
          topic: data.title,
          start_time: startTimeJakarta,
          duration: data.duration,
          agenda: data.description ?? undefined,
          password: data.zoomPassword ?? undefined,
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
    }

    // Extract time field and exclude it from the data passed to Prisma
    const { time: _time, ...restOfData } = data as Omit<Meeting, 'id'> & {
      time?: string
    }
    // 4. Create the meeting in our database
    const meeting = await prisma.meeting.create({
      data: {
        ...restOfData,
        participants: data.participants,
        zoomMeetingId: zoomMeetingData?.zoomMeetingId,
        zoomJoinUrl: zoomMeetingData?.zoomJoinUrl,
        zoomStartUrl: zoomMeetingData?.zoomStartUrl,
        zoomPassword: zoomMeetingData?.zoomPassword,
        zoomCredentialId: zoomMeetingData?.credentialId, // Link the meeting to the credential
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

    // Case 1: Meeting is being converted to a Zoom meeting
    if (data.isZoomMeeting && !currentMeeting.isZoomMeeting) {
      const meetingDate = data.date
        ? data.date instanceof Date
          ? data.date
          : new Date(data.date)
        : currentMeeting.date
      const credential = await getBalancedZoomCredential()
      if (!credential) {
        throw new Error(
          'CAPACITY_FULL: All Zoom accounts are at maximum capacity.',
        )
      }
      const createdZoomMeeting = await createZoomMeeting(
        {
          topic: data.title || currentMeeting.title,
          start_time: format(meetingDate, "yyyy-MM-dd'T'HH:mm:ss"),
          duration: data.duration || currentMeeting.duration,
          agenda: data.description ?? undefined,
          password: data.zoomPassword ?? undefined,
        },
        credential,
      )
      zoomData = {
        zoomMeetingId: createdZoomMeeting.zoomMeetingId,
        zoomJoinUrl: createdZoomMeeting.zoomJoinUrl,
        zoomStartUrl: createdZoomMeeting.zoomStartUrl,
        zoomPassword: createdZoomMeeting.zoomPassword,
        zoomCredentialId: createdZoomMeeting.credentialId,
      }
    }
    // Case 2: Meeting is no longer a Zoom meeting
    else if (data.isZoomMeeting === false && currentMeeting.isZoomMeeting) {
      if (currentMeeting.zoomMeetingId) {
        await deleteZoomMeeting(currentMeeting.zoomMeetingId)
      }
      zoomData = {
        zoomMeetingId: null,
        zoomJoinUrl: null,
        zoomStartUrl: null,
        zoomPassword: null,
        zoomCredentialId: null,
      }
    }
    // Case 3: A Zoom meeting is being updated
    else if (data.isZoomMeeting && currentMeeting.isZoomMeeting) {
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
              (data.description !== undefined
                ? data.description
                : currentMeeting.description) ?? undefined,
            password: data.zoomPassword ?? undefined,
          },
        )
        zoomData = {
          zoomMeetingId: updatedZoomMeeting.zoomMeetingId,
          zoomJoinUrl: updatedZoomMeeting.zoomJoinUrl,
          zoomStartUrl: updatedZoomMeeting.zoomStartUrl,
          zoomPassword: updatedZoomMeeting.zoomPassword,
        }
      }
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...data,
        participants: data.participants,
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
    users: users.map(formatUser),
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
  return users.map(formatUser)
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

    return formatUser(user)
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

    return formatUser(user)
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

  return user ? formatUser(user) : null
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

    return formatUser(user)
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

  const userIds = mostActiveUsersData.map((u) => u.organizerId)
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const mostActiveUsers = mostActiveUsersData.map((u) => ({
    ...(userMap.get(u.organizerId) as User),
    meetingCount: u._count.organizerId,
  }))

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

  return formatUser(user)
}

export const changeUserPassword = async (
  userId: string,
  newPass: string,
): Promise<boolean> => {
  const newPasswordHash = await bcrypt.hash(newPass, 10)
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })
    return true
  } catch {
    return false
  }
}
