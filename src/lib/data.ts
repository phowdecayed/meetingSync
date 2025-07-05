import prisma from './prisma';
import type { Meeting as PrismaMeeting, User as PrismaUser, ZoomAccount as PrismaZoomAccount } from '@prisma/client';
import bcrypt from 'bcrypt';

// --- SHARED TYPES & UTILS ---
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

export type FullUser = User & { passwordHash?: string };

const toAppMeeting = (meeting: PrismaMeeting): Meeting => ({
  ...meeting,
  description: meeting.description ?? undefined,
  participants: meeting.participants.split(',').map(p => p.trim()).filter(Boolean),
});

const toAppUser = (user: PrismaUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role as 'admin' | 'member'
});

const useMock = process.env.FIREBASE_STUDIO_ENV === 'true';

// --- MOCK IMPLEMENTATION ---

let mockUsers: FullUser[] = [];
let mockMeetings: Meeting[] = [];
let mockZoomAccounts: { id: string; email: string; }[] = [];
let mockInitialized = false;

const initializeMockData = async () => {
  if (mockInitialized) return;

  const passwordHash = await bcrypt.hash('password123', 10);

  mockUsers = [
    { id: 'clx1', name: 'Admin User', email: 'admin@example.com', role: 'admin', passwordHash },
    { id: 'clx2', name: 'Member User', email: 'member@example.com', role: 'member', passwordHash },
    { id: 'clx3', name: 'Carol Danvers', email: 'carol@example.com', role: 'member', passwordHash },
    { id: 'clx4', name: 'Peter Parker', email: 'peter@example.com', role: 'member', passwordHash },
    { id: 'clx5', name: 'Tony Stark', email: 'tony@example.com', role: 'member', passwordHash },
  ];

  mockZoomAccounts = [
      { id: 'za1', email: 'corp-zoom-1@example.com' },
      { id: 'za2', email: 'corp-zoom-2@example.com' },
      { id: 'za3', email: 'corp-zoom-3@example.com' },
  ];
  
  mockMeetings = [
    { id: 'm1', title: 'Quarterly Business Review', date: new Date(new Date().setDate(new Date().getDate() + 3)), duration: 60, participants: ['ceo@example.com', 'cto@example.com'], description: 'Review of Q3 performance and planning for Q4.', organizerId: 'clx1', zoomAccountId: 'za1' },
    { id: 'm2', title: 'Project Phoenix - Standup', date: new Date(new Date().setDate(new Date().getDate() + 1)), duration: 15, participants: ['member@example.com', 'dev1@example.com'], organizerId: 'clx2', zoomAccountId: 'za2' },
    { id: 'm3', title: 'Marketing Strategy Session', date: new Date(new Date().setDate(new Date().getDate() + 5)), duration: 90, participants: ['marketing-head@example.com', 'admin@example.com'], description: 'Brainstorming for next year\'s marketing campaigns.', organizerId: 'clx1', zoomAccountId: 'za1' },
    { id: 'm4', title: 'Past Meeting: Design Sync', date: new Date(new Date().setDate(new Date().getDate() - 2)), duration: 45, participants: ['designer1@example.com', 'designer2@example.com'], organizerId: 'clx2', zoomAccountId: 'za3' },
  ];
  
  mockInitialized = true;
};

const getLeastUtilizedAccountMock = async (): Promise<string> => {
    if (mockZoomAccounts.length === 0) return 'default-zoom-account-mock';

    const countsMap = new Map<string, number>();
    mockZoomAccounts.forEach(acc => countsMap.set(acc.id, 0));

    mockMeetings
        .filter(m => m.date >= new Date())
        .forEach(m => {
            countsMap.set(m.zoomAccountId, (countsMap.get(m.zoomAccountId) || 0) + 1);
        });
    
    let leastUtilizedAccountId = mockZoomAccounts[0].id;
    let minMeetings = countsMap.get(leastUtilizedAccountId) ?? Infinity;

    for (const [accountId, count] of countsMap.entries()) {
        if (count < minMeetings) {
            minMeetings = count;
            leastUtilizedAccountId = accountId;
        }
    }
    return leastUtilizedAccountId;
}

const mockApi = {
    async getZoomAccounts(): Promise<{ id: string; email: string; }[]> { await initializeMockData(); return [...mockZoomAccounts]; },
    async addZoomAccount(email: string): Promise<{ id: string; email: string; }> {
        await initializeMockData();
        if (mockZoomAccounts.find(a => a.email === email)) throw new Error("An account with this email already exists.");
        const newAccount = { id: `za${Date.now()}`, email };
        mockZoomAccounts.push(newAccount);
        return newAccount;
    },
    async removeZoomAccount(id:string): Promise<{ success: boolean }> {
        await initializeMockData();
        mockZoomAccounts = mockZoomAccounts.filter(a => a.id !== id);
        return { success: true };
    },
    async getMeetings(): Promise<Meeting[]> { await initializeMockData(); return [...mockMeetings]; },
    async getMeetingById(id: string): Promise<Meeting | undefined> { await initializeMockData(); return mockMeetings.find(m => m.id === id); },
    async createMeeting(data: Omit<Meeting, 'id' | 'zoomAccountId'>): Promise<Meeting> {
        await initializeMockData();
        const newMeeting: Meeting = {
            ...data,
            id: `m${Date.now()}`,
            zoomAccountId: await getLeastUtilizedAccountMock(),
        };
        mockMeetings.push(newMeeting);
        return newMeeting;
    },
    async updateMeeting(id: string, data: Partial<Omit<Meeting, 'id'>>): Promise<Meeting> {
        await initializeMockData();
        const meetingIndex = mockMeetings.findIndex(m => m.id === id);
        if (meetingIndex === -1) throw new Error("Meeting not found");
        mockMeetings[meetingIndex] = { ...mockMeetings[meetingIndex], ...data };
        return mockMeetings[meetingIndex];
    },
    async deleteMeeting(id: string): Promise<{ success: boolean }> {
        await initializeMockData();
        mockMeetings = mockMeetings.filter(m => m.id !== id);
        return { success: true };
    },
    async getUsers(): Promise<User[]> { await initializeMockData(); return mockUsers.map(({passwordHash, ...user}) => user); },
    async createUser(data: { name: string; email: string; role: 'admin' | 'member', passwordHash: string }): Promise<User> {
        await initializeMockData();
        if (mockUsers.find(u => u.email === data.email)) throw new Error('A user with this email already exists.');
        const newUser: FullUser = { id: `u${Date.now()}`, ...data };
        mockUsers.push(newUser);
        const { passwordHash, ...userToReturn } = newUser;
        return userToReturn;
    },
    async updateUserRole(id: string, role: 'admin' | 'member'): Promise<User> {
        await initializeMockData();
        const userIndex = mockUsers.findIndex(u => u.id === id);
        if (userIndex === -1) throw new Error("User not found");
        mockUsers[userIndex].role = role;
        const { passwordHash, ...userToReturn } = mockUsers[userIndex];
        return userToReturn;
    },
    async deleteUserById(id: string): Promise<{ success: boolean }> {
        await initializeMockData();
        mockUsers = mockUsers.filter(u => u.id !== id);
        return { success: true };
    },
    async getUserByEmail(email: string): Promise<User | null> {
        await initializeMockData();
        const user = mockUsers.find(u => u.email === email);
        if (!user) return null;
        const { passwordHash, ...userToReturn } = user;
        return userToReturn;
    },
    async updateAuthUser(id: string, data: { name: string }): Promise<User> {
        await initializeMockData();
        const userIndex = mockUsers.findIndex(u => u.id === id);
        if (userIndex === -1) throw new Error("User not found");
        mockUsers[userIndex].name = data.name;
        const { passwordHash, ...userToReturn } = mockUsers[userIndex];
        return userToReturn;
    },
    async verifyUserCredentials(email: string, pass: string): Promise<User | null> {
        await initializeMockData();
        const user = mockUsers.find(u => u.email === email);
        if (!user || !user.passwordHash) return null;
        const isValid = await bcrypt.compare(pass, user.passwordHash);
        if (!isValid) return null;
        const { passwordHash, ...userToReturn } = user;
        return userToReturn;
    },
    async changeUserPassword(data: { userId: string, currentPassword: string, newPassword: string }): Promise<void> {
        await initializeMockData();
        const userIndex = mockUsers.findIndex(u => u.id === data.userId);
        if (userIndex === -1) throw new Error("User not found.");
        const user = mockUsers[userIndex];
        if (!user.passwordHash) throw new Error("User does not have a password set.");

        const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
        if (!isMatch) throw new Error("Current password does not match.");
        
        const newPasswordHash = await bcrypt.hash(data.newPassword, 10);
        mockUsers[userIndex].passwordHash = newPasswordHash;
    }
};

// --- PRISMA IMPLEMENTATION ---

const getLeastUtilizedAccountPrisma = async (): Promise<string> => {
    const zoomAccounts = await prisma.zoomAccount.findMany({ select: { id: true }});
    if (zoomAccounts.length === 0) {
      throw new Error("No Zoom accounts configured. Please add one in settings.");
    }

    const usageCounts = await prisma.meeting.groupBy({
        by: ['zoomAccountId'],
        where: { date: { gte: new Date() } },
        _count: { id: true }
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

const prismaApi = {
    async getZoomAccounts(): Promise<{ id: string; email: string; }[]> { return prisma.zoomAccount.findMany(); },
    async addZoomAccount(email: string): Promise<{ id: string; email: string; }> {
        const existing = await prisma.zoomAccount.findUnique({ where: { email }});
        if (existing) throw new Error("An account with this email already exists.");
        return prisma.zoomAccount.create({ data: { email } });
    },
    async removeZoomAccount(id:string): Promise<{ success: boolean }> {
        await prisma.zoomAccount.delete({ where: { id } });
        return { success: true };
    },
    async getMeetings(): Promise<Meeting[]> { const meetings = await prisma.meeting.findMany(); return meetings.map(toAppMeeting); },
    async getMeetingById(id: string): Promise<Meeting | undefined> {
        const meeting = await prisma.meeting.findUnique({ where: { id } });
        return meeting ? toAppMeeting(meeting) : undefined;
    },
    async createMeeting(data: Omit<Meeting, 'id' | 'zoomAccountId'>): Promise<Meeting> {
        const newMeetingData = {
            ...data,
            participants: data.participants.join(','),
            zoomAccountId: await getLeastUtilizedAccountPrisma(),
        };
        const newMeeting = await prisma.meeting.create({ data: newMeetingData });
        return toAppMeeting(newMeeting);
    },
    async updateMeeting(id: string, data: Partial<Omit<Meeting, 'id'>>): Promise<Meeting> {
        const updateData: any = { ...data };
        if (data.participants) updateData.participants = data.participants.join(',');
        const updatedMeeting = await prisma.meeting.update({ where: { id }, data: updateData });
        return toAppMeeting(updatedMeeting);
    },
    async deleteMeeting(id: string): Promise<{ success: boolean }> {
        await prisma.meeting.delete({ where: { id } });
        return { success: true };
    },
    async getUsers(): Promise<User[]> { const users = await prisma.user.findMany(); return users.map(toAppUser); },
    async createUser(data: { name: string; email: string; role: 'admin' | 'member', passwordHash: string }): Promise<User> {
        const existing = await prisma.user.findUnique({ where: { email: data.email }});
        if (existing) throw new Error('A user with this email already exists.');
        const newUser = await prisma.user.create({ data });
        return toAppUser(newUser);
    },
    async updateUserRole(id: string, role: 'admin' | 'member'): Promise<User> {
        const updatedUser = await prisma.user.update({ where: { id }, data: { role } });
        return toAppUser(updatedUser);
    },
    async deleteUserById(id: string): Promise<{ success: boolean }> {
        await prisma.user.delete({ where: { id } });
        return { success: true };
    },
    async getUserByEmail(email: string): Promise<User | null> {
        const user = await prisma.user.findUnique({ where: { email } });
        return user ? toAppUser(user) : null;
    },
    async updateAuthUser(id: string, data: { name: string }): Promise<User> {
        const user = await prisma.user.update({ where: { id }, data: { name: data.name } });
        return toAppUser(user);
    },
    async verifyUserCredentials(email: string, pass: string): Promise<User | null> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(pass, user.passwordHash);
        if (!isValid) return null;

        return toAppUser(user);
    },
    async changeUserPassword(data: { userId: string, currentPassword: string, newPassword: string }): Promise<void> {
        const user = await prisma.user.findUnique({ where: { id: data.userId }});
        if (!user || !user.passwordHash) throw new Error("User not found or password not set.");
        
        const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
        if (!isMatch) throw new Error("Current password does not match.");

        const newPasswordHash = await bcrypt.hash(data.newPassword, 10);
        await prisma.user.update({ where: { id: data.userId }, data: { passwordHash: newPasswordHash } });
    }
};

// --- EXPORTS ---
const api = useMock ? mockApi : prismaApi;

export const {
    getZoomAccounts,
    addZoomAccount,
    removeZoomAccount,
    getMeetings,
    getMeetingById,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    getUsers,
    createUser,
    updateUserRole,
    deleteUserById,
    getUserByEmail,
    updateAuthUser,
    verifyUserCredentials,
    changeUserPassword,
} = api;
