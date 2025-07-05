import prisma from './prisma';
import type { Meeting as PrismaMeeting, User as PrismaUser } from '@prisma/client';

export type Meeting = {
  id: string;
  title: string;
  date: Date;
  duration: number; // in minutes
  participants: string[];
  description?: string;
  organizerId: string;
  zoomAccountId: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
};

const toAppMeeting = (meeting: PrismaMeeting): Meeting => ({
  ...meeting,
  description: meeting.description ?? undefined,
  participants: meeting.participants.split(',').map(p => p.trim()).filter(Boolean),
});

const toAppUser = (user: PrismaUser): User => ({
  ...user,
  role: user.role as 'admin' | 'member'
});

// --- Mock API Functions ---

// Zoom Account Management
export const getZoomAccounts = async (): Promise<{ id: string; email: string; }[]> => {
    return prisma.zoomAccount.findMany();
};

export const addZoomAccount = async (email: string): Promise<{ id: string; email: string; }> => {
    const existing = await prisma.zoomAccount.findUnique({ where: { email }});
    if (existing) {
        throw new Error("An account with this email already exists.");
    }
    return prisma.zoomAccount.create({ data: { email } });
};

export const removeZoomAccount = async (id:string): Promise<{ success: boolean }> => {
    await prisma.zoomAccount.delete({ where: { id } });
    return { success: true };
};

// Simulate load balancing by finding the account with the fewest upcoming meetings.
const getLeastUtilizedAccount = async (): Promise<string> => {
    const zoomAccounts = await prisma.zoomAccount.findMany({ select: { id: true }});
    if (zoomAccounts.length === 0) {
      return 'default-zoom-account'; // Fallback if no accounts are configured
    }

    const usageCounts = await prisma.meeting.groupBy({
        by: ['zoomAccountId'],
        where: {
            date: {
                gte: new Date()
            }
        },
        _count: {
            id: true
        }
    });

    const countsMap = new Map<string, number>();
    zoomAccounts.forEach(acc => countsMap.set(acc.id, 0));
    usageCounts.forEach(group => {
        countsMap.set(group.zoomAccountId, group._count.id);
    });
    
    let leastUtilizedAccountId = zoomAccounts[0].id;
    let minMeetings = countsMap.get(leastUtilizedAccountId) ?? Infinity;

    for (const [accountId, count] of countsMap.entries()) {
        if (count < minMeetings) {
            minMeetings = count;
            leastUtilizedAccountId = accountId;
        }
    }
    
    return leastUtilizedAccountId;
}

export const getMeetings = async (): Promise<Meeting[]> => {
  const meetings = await prisma.meeting.findMany();
  return meetings.map(toAppMeeting);
};

export const getMeetingById = async (id: string): Promise<Meeting | undefined> => {
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  return meeting ? toAppMeeting(meeting) : undefined;
}

export const createMeeting = async (data: Omit<Meeting, 'id' | 'zoomAccountId'>): Promise<Meeting> => {
  const newMeetingData = {
      ...data,
      participants: data.participants.join(','),
      zoomAccountId: await getLeastUtilizedAccount(),
  };
  const newMeeting = await prisma.meeting.create({ data: newMeetingData });
  return toAppMeeting(newMeeting);
};

export const updateMeeting = async (id: string, data: Partial<Omit<Meeting, 'id'>>): Promise<Meeting> => {
    const updateData: any = { ...data };
    if (data.participants) {
        updateData.participants = data.participants.join(',');
    }
    
    const updatedMeeting = await prisma.meeting.update({
        where: { id },
        data: updateData,
    });
    return toAppMeeting(updatedMeeting);
}

export const deleteMeeting = async (id: string): Promise<{ success: boolean }> => {
    await prisma.meeting.delete({ where: { id } });
    return { success: true };
}

export const getUsers = async (): Promise<User[]> => {
  const users = await prisma.user.findMany();
  return users.map(toAppUser);
};

export const createUser = async (data: { name: string; email: string; role: 'admin' | 'member'}): Promise<User> => {
    const existing = await prisma.user.findUnique({ where: { email: data.email }});
    if (existing) {
        throw new Error('A user with this email already exists.');
    }
  const newUser = await prisma.user.create({ data });
  return toAppUser(newUser);
};

export const updateUserRole = async (id: string, role: 'admin' | 'member'): Promise<User> => {
    const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
    });
    return toAppUser(updatedUser);
}

export const deleteUserById = async (id: string): Promise<{ success: boolean }> => {
    await prisma.user.delete({ where: { id } });
    return { success: true };
}

export const getUserByEmail = async (email: string): Promise<User | null> => {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? toAppUser(user) : null;
}

export const updateAuthUser = async (id: string, data: { name: string }): Promise<User> => {
    const user = await prisma.user.update({
        where: { id },
        data: { name: data.name }
    });
    return toAppUser(user);
}
