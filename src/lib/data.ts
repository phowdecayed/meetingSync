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
    // Create Zoom meeting first
    const zoomMeetingData = await createZoomMeeting({
      title: data.title,
      date: data.date,
      duration: data.duration,
      description: data.description
    });
    
    // Create meeting in our database with Zoom info
    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        date: data.date,
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
    if (data.title || data.date || data.duration || data.description !== undefined) {
      if (currentMeeting.zoomMeetingId) {
        const updatedZoomMeeting = await updateZoomMeeting(
          currentMeeting.zoomMeetingId,
          {
            title: data.title || currentMeeting.title,
            date: data.date || currentMeeting.date,
            duration: data.duration || currentMeeting.duration,
            description: data.description !== undefined ? data.description : currentMeeting.description || '',
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
        ...(data.date && { date: data.date }),
        ...(data.duration && { duration: data.duration }),
        ...(data.participants && { 
          participants: Array.isArray(data.participants) ? data.participants.join(', ') : data.participants 
        }),
        ...(data.description !== undefined && { description: data.description }),
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
