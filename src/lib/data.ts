import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { PrismaClient } from '@prisma/client';
import { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting } from './zoom';

// --- SHARED TYPES & UTILS ---
export type Meeting = {
  id: string;
  title: string;
  date: Date;
  duration: number; // in minutes
  participants: string[];
  description?: string;
  password?: string; // Password for Zoom meeting
  organizerId: string;
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  zoomPassword?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
};

// Tipe dari skema Prisma
type PrismaMeeting = {
  id: string;
  title: string;
  date: Date;
  duration: number;
  participants: string;
  description: string | null;
  organizerId: string;
  zoomMeetingId: string | null;
  zoomJoinUrl: string | null;
  zoomStartUrl: string | null;
  zoomPassword: string | null;
};

type PrismaUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string | null;
};

// Add password for user creation and verification
export type FullUser = User & { password?: string };

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
  };
};

// Helper function to format User data
const formatUser = (user: PrismaUser): User => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as 'admin' | 'member',
  };
};

export const getMeetings = async (): Promise<Meeting[]> => {
  const meetings = await prisma.meeting.findMany();
  return meetings.map(formatMeeting);
};

export const getMeetingById = async (id: string): Promise<Meeting | undefined> => {
  const meeting = await prisma.meeting.findUnique({
    where: { id }
  });
  return meeting ? formatMeeting(meeting) : undefined;
};

export const createMeeting = async (data: Omit<Meeting, 'id'>): Promise<Meeting> => {
  try {
    // Ensure date is a proper Date object
    const meetingDate = data.date instanceof Date ? data.date : new Date(data.date);
    const newStart = meetingDate;
    const newEnd = new Date(meetingDate.getTime() + data.duration * 60 * 1000);

    // Find all meetings on the same day
    const startOfDay = new Date(newStart);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(newStart);
    endOfDay.setHours(23, 59, 59, 999);
    const meetingsOnDay = await prisma.meeting.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Check for overlap
    const overlapCount = meetingsOnDay.reduce((count, m) => {
      const existingStart = new Date(m.date);
      const existingEnd = new Date(existingStart.getTime() + m.duration * 60 * 1000);
      return newStart < existingEnd && newEnd > existingStart ? count + 1 : count;
    }, 0);
    if (overlapCount >= 2) {
      throw new Error('A maximum of 2 meetings can run simultaneously in the same timeslot.');
    }

    // Create Zoom meeting first with detailed settings based on API requirements
    const zoomMeetingData = await createZoomMeeting({
      topic: data.title,
      start_time: data.date as unknown as string, // Pass the string directly
      duration: data.duration,
      agenda: data.description,
      password: data.password || "rahasia", // Use provided password or default
      type: 2, // Scheduled meeting (2 = scheduled)
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
        contact_name: "BPKAD Zoom Book Admin",
        contact_email: "bpkad@jabarprov.go.id",
        email_notification: true,
      }
    });
    
    // Create meeting in our database with Zoom info
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        date: meetingDate,
        duration: data.duration,
        participants: Array.isArray(data.participants) ? data.participants.join(', ') : data.participants,
        description: data.description || '',
        organizerId: data.organizerId,
        zoomMeetingId: zoomMeetingData.zoomMeetingId,
        zoomJoinUrl: zoomMeetingData.zoomJoinUrl,
        zoomStartUrl: zoomMeetingData.zoomStartUrl,
        zoomPassword: zoomMeetingData.zoomPassword,
      }
    });
    
    return formatMeeting(meeting);
  } catch (error) {
    console.error('Failed to create meeting with Zoom integration:', error);
    throw new Error('Failed to create meeting with Zoom integration');
  }
};

export const updateMeeting = async (id: string, data: Partial<Omit<Meeting, 'id'>>): Promise<Meeting> => {
  try {
    // Get current meeting to check if we need to update Zoom
    const currentMeeting = await prisma.meeting.findUnique({ where: { id } });
    if (!currentMeeting) {
      throw new Error('Meeting not found');
    }
    
    let zoomData = {};
    
    // If we have meeting title, date, duration, or description changes, update Zoom meeting
    if (data.title || data.date || data.duration || data.description !== undefined || data.password !== undefined) {
      if (currentMeeting.zoomMeetingId) {
        // Ensure date is a proper Date object if provided
        const meetingDate = data.date ? (data.date instanceof Date ? data.date : new Date(data.date)) : currentMeeting.date;
        
        const updatedZoomMeeting = await updateZoomMeeting(
          currentMeeting.zoomMeetingId,
          {
            title: data.title || currentMeeting.title,
            date: meetingDate,
            duration: data.duration || currentMeeting.duration,
            description: data.description !== undefined ? data.description : currentMeeting.description || '',
            password: data.password !== undefined ? data.password : currentMeeting.zoomPassword || '',
          }
        );
        
        zoomData = {
          zoomMeetingId: updatedZoomMeeting.zoomMeetingId,
          zoomJoinUrl: updatedZoomMeeting.zoomJoinUrl,
          zoomStartUrl: updatedZoomMeeting.zoomStartUrl,
          zoomPassword: updatedZoomMeeting.zoomPassword,
        };
      }
    }
    
    // Update the meeting in our database
    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.date && { date: data.date instanceof Date ? data.date : new Date(data.date) }),
        ...(data.duration && { duration: data.duration }),
        ...(data.participants && { 
          participants: Array.isArray(data.participants) ? data.participants.join(', ') : data.participants 
        }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.password !== undefined && { password: data.password }),
        ...(data.organizerId && { organizerId: data.organizerId }),
        ...zoomData,
      }
    });
    
    return formatMeeting(meeting);
  } catch (error) {
    console.error('Failed to update meeting with Zoom integration:', error);
    throw new Error('Failed to update meeting with Zoom integration');
  }
};

export const deleteMeeting = async (id: string): Promise<{ success: boolean }> => {
  try {
    // Get the meeting first to delete from Zoom
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    
    if (meeting && meeting.zoomMeetingId) {
      // Delete from Zoom
      await deleteZoomMeeting(meeting.zoomMeetingId);
    }
    
    // Delete from our database
    await prisma.meeting.delete({
      where: { id }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return { success: false };
  }
};

export const deleteDbMeeting = async (id: string): Promise<void> => {
  try {
    await prisma.meeting.delete({ where: { id } });
  } catch (error) {
    console.error(`Failed to delete meeting ${id} from database:`, error);
    throw new Error('Database deletion failed.');
  }
};

export const getUsers = async (): Promise<User[]> => {
  const users = await prisma.user.findMany();
  return users.map(formatUser);
};

export const createUser = async (data: { name: string; email: string; role: 'admin' | 'member', password?: string }): Promise<User> => {
  if (!data.password) throw new Error('Password is required.');
  
  const passwordHash = await bcrypt.hash(data.password, 10);
  
  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash
      }
    });
    
    return formatUser(user);
  } catch (error) {
    throw new Error('A user with this email already exists.');
  }
};

export const updateUserRole = async(id: string, role: 'admin' | 'member'): Promise<User> => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role }
    });
    
    return formatUser(user);
  } catch (error) {
    throw new Error("User not found");
  }
};

export const deleteUserById = async(id: string): Promise<{ success: boolean }> => {
  try {
    await prisma.user.delete({
      where: { id }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  return user ? formatUser(user) : null;
};

export const updateAuthUser = async(id: string, data: { name: string }): Promise<User> => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { name: data.name }
    });
    
    return formatUser(user);
  } catch (error) {
    throw new Error("User not found");
  }
};

export const verifyUserCredentials = async (email: string, pass: string): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user || !user.passwordHash) return null;

  const passwordsMatch = await bcrypt.compare(pass, user.passwordHash);
  if (!passwordsMatch) return null;
  
  return formatUser(user);
};
