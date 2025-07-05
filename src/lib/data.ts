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

// Add password for mock user creation and verification
export type FullUser = User & { password?: string };


// --- MOCK IMPLEMENTATION ---

let mockUsers: FullUser[] = [];
let mockMeetings: Meeting[] = [];
let mockZoomAccounts: { id: string; email: string; }[] = [];
let mockInitialized = false;

const initializeMockData = async () => {
  if (mockInitialized) return;

  mockUsers = [
    { id: 'clx1', name: 'Admin User', email: 'admin@example.com', role: 'admin', password: 'password123' },
    { id: 'clx2', name: 'Member User', email: 'member@example.com', role: 'member', password: 'password123' },
    { id: 'clx3', name: 'Carol Danvers', email: 'carol@example.com', role: 'member', password: 'password123' },
    { id: 'clx4', name: 'Peter Parker', email: 'peter@example.com', role: 'member', password: 'password123' },
    { id: 'clx5', name: 'Tony Stark', email: 'tony@example.com', role: 'member', password: 'password123' },
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

const getLeastUtilizedAccount = async (): Promise<string> => {
    await initializeMockData();
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

export const getZoomAccounts = async(): Promise<{ id: string; email: string; }[]> => { await initializeMockData(); return [...mockZoomAccounts]; }
export const addZoomAccount = async (email: string): Promise<{ id: string; email: string; }> => {
    await initializeMockData();
    if (mockZoomAccounts.find(a => a.email === email)) throw new Error("An account with this email already exists.");
    const newAccount = { id: `za${Date.now()}`, email };
    mockZoomAccounts.push(newAccount);
    return newAccount;
}
export const removeZoomAccount = async (id:string): Promise<{ success: boolean }> => {
    await initializeMockData();
    mockZoomAccounts = mockZoomAccounts.filter(a => a.id !== id);
    return { success: true };
}
export const getMeetings = async (): Promise<Meeting[]> => { await initializeMockData(); return [...mockMeetings]; }
export const getMeetingById = async (id: string): Promise<Meeting | undefined> => { await initializeMockData(); return mockMeetings.find(m => m.id === id); }
export const createMeeting = async (data: Omit<Meeting, 'id' | 'zoomAccountId'>): Promise<Meeting> => {
    await initializeMockData();
    const newMeeting: Meeting = {
        ...data,
        id: `m${Date.now()}`,
        zoomAccountId: await getLeastUtilizedAccount(),
    };
    mockMeetings.push(newMeeting);
    return newMeeting;
}
export const updateMeeting = async (id: string, data: Partial<Omit<Meeting, 'id'>>): Promise<Meeting> => {
    await initializeMockData();
    const meetingIndex = mockMeetings.findIndex(m => m.id === id);
    if (meetingIndex === -1) throw new Error("Meeting not found");
    mockMeetings[meetingIndex] = { ...mockMeetings[meetingIndex], ...data };
    return mockMeetings[meetingIndex];
}
export const deleteMeeting = async (id: string): Promise<{ success: boolean }> => {
    await initializeMockData();
    mockMeetings = mockMeetings.filter(m => m.id !== id);
    return { success: true };
}
export const getUsers = async (): Promise<User[]> => { await initializeMockData(); return mockUsers.map(({password, ...user}) => user); }
export const createUser = async (data: { name: string; email: string; role: 'admin' | 'member', password?: string }): Promise<User> => {
    await initializeMockData();
    if (mockUsers.find(u => u.email === data.email)) throw new Error('A user with this email already exists.');
    const newUser: FullUser = { id: `u${Date.now()}`, ...data };
    mockUsers.push(newUser);
    const { password, ...userToReturn } = newUser;
    return userToReturn;
}
export const updateUserRole = async(id: string, role: 'admin' | 'member'): Promise<User> => {
    await initializeMockData();
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error("User not found");
    mockUsers[userIndex].role = role;
    const { password, ...userToReturn } = mockUsers[userIndex];
    return userToReturn;
}
export const deleteUserById = async(id: string): Promise<{ success: boolean }> => {
    await initializeMockData();
    mockUsers = mockUsers.filter(u => u.id !== id);
    return { success: true };
}
export const getUserByEmail = async (email: string): Promise<User | null> => {
    await initializeMockData();
    const user = mockUsers.find(u => u.email === email);
    if (!user) return null;
    const { password, ...userToReturn } = user;
    return userToReturn;
}
export const updateAuthUser = async(id: string, data: { name: string }): Promise<User> => {
    await initializeMockData();
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error("User not found");
    mockUsers[userIndex].name = data.name;
    const { password, ...userToReturn } = mockUsers[userIndex];
    return userToReturn;
}
export const verifyUserCredentials = async (email: string, pass: string): Promise<User | null> => {
    await initializeMockData();
    const user = mockUsers.find(u => u.email === email && u.password === pass);
    if (!user) return null;
    const { password, ...userToReturn } = user;
    return userToReturn;
}
