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

export let users: User[] = [
  { id: 'user-1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  { id: 'user-2', name: 'Member User', email: 'member@example.com', role: 'member' },
  { id: 'user-3', name: 'Carol Danvers', email: 'carol@example.com', role: 'member' },
  { id: 'user-4', name: 'Peter Parker', email: 'peter@example.com', role: 'member' },
  { id: 'user-5', name: 'Tony Stark', email: 'tony@example.com', role: 'member' },
];

export let zoomAccounts = [
  { id: 'zoom-1', email: 'corp-zoom-1@example.com' },
  { id: 'zoom-2', email: 'corp-zoom-2@example.com' },
  { id: 'zoom-3', email: 'corp-zoom-3@example.com' },
];

export let meetings: Meeting[] = [
  {
    id: 'mtg-1',
    title: 'Quarterly Business Review',
    date: new Date(new Date().setDate(new Date().getDate() + 3)),
    duration: 60,
    participants: ['ceo@example.com', 'cto@example.com'],
    description: 'Review of Q3 performance and planning for Q4.',
    organizerId: 'user-1',
    zoomAccountId: 'zoom-1',
  },
  {
    id: 'mtg-2',
    title: 'Project Phoenix - Standup',
    date: new Date(new Date().setDate(new Date().getDate() + 1)),
    duration: 15,
    participants: ['member@example.com', 'dev1@example.com', 'dev2@example.com'],
    organizerId: 'user-2',
    zoomAccountId: 'zoom-2',
  },
  {
    id: 'mtg-3',
    title: 'Marketing Strategy Session',
    date: new Date(new Date().setDate(new Date().getDate() + 5)),
    duration: 90,
    participants: ['marketing-head@example.com', 'admin@example.com'],
    description: 'Brainstorming for next year\'s marketing campaigns.',
    organizerId: 'user-1',
    zoomAccountId: 'zoom-1',
  },
  {
    id: 'mtg-4',
    title: 'Past Meeting: Design Sync',
    date: new Date(new Date().setDate(new Date().getDate() - 2)),
    duration: 45,
    participants: ['designer1@example.com', 'designer2@example.com'],
    organizerId: 'user-2',
    zoomAccountId: 'zoom-3',
  },
];

// --- Mock API Functions ---

// Zoom Account Management
export const getZoomAccounts = async (): Promise<{ id: string; email: string; }[]> => {
    await new Promise(res => setTimeout(res, 300));
    return zoomAccounts;
};

export const addZoomAccount = async (email: string): Promise<{ id: string; email: string; }> => {
    await new Promise(res => setTimeout(res, 500));
    if (zoomAccounts.some(acc => acc.email === email)) {
        throw new Error("An account with this email already exists.");
    }
    const newAccount = {
        id: `zoom-${Date.now()}`,
        email: email,
    };
    zoomAccounts.push(newAccount);
    return newAccount;
};

export const removeZoomAccount = async (id:string): Promise<{ success: boolean }> => {
    await new Promise(res => setTimeout(res, 500));
    const initialLength = zoomAccounts.length;
    zoomAccounts = zoomAccounts.filter(acc => acc.id !== id);
    if (zoomAccounts.length === initialLength) {
        throw new Error("Zoom account not found.");
    }
    return { success: true };
};

// Simulate load balancing by finding the account with the fewest upcoming meetings.
const getLeastUtilizedAccount = (): string => {
  if (zoomAccounts.length === 0) {
    return 'default-zoom-account'; // Fallback if no accounts are configured
  }

  const now = new Date();
  const upcomingMeetings = meetings.filter(m => new Date(m.date) >= now);

  const usageCounts = new Map<string, number>();
  zoomAccounts.forEach(acc => usageCounts.set(acc.id, 0));

  upcomingMeetings.forEach(meeting => {
    if (usageCounts.has(meeting.zoomAccountId)) {
      usageCounts.set(meeting.zoomAccountId, usageCounts.get(meeting.zoomAccountId)! + 1);
    }
  });

  let leastUtilizedAccountId = zoomAccounts[0].id;
  let minMeetings = usageCounts.get(leastUtilizedAccountId) ?? Infinity;

  for (const [accountId, count] of usageCounts.entries()) {
    if (count < minMeetings) {
      minMeetings = count;
      leastUtilizedAccountId = accountId;
    }
  }

  return leastUtilizedAccountId;
}

export const getMeetings = async (): Promise<Meeting[]> => {
  await new Promise(res => setTimeout(res, 500)); // Simulate network delay
  return meetings;
};

export const getMeetingById = async (id: string): Promise<Meeting | undefined> => {
  await new Promise(res => setTimeout(res, 300));
  return meetings.find(m => m.id === id);
}

export const createMeeting = async (data: Omit<Meeting, 'id' | 'zoomAccountId'>): Promise<Meeting> => {
  await new Promise(res => setTimeout(res, 1000));
  const newMeeting: Meeting = {
    ...data,
    id: `mtg-${Date.now()}`,
    zoomAccountId: getLeastUtilizedAccount(),
  };
  meetings.push(newMeeting);
  return newMeeting;
};

export const updateMeeting = async (id: string, data: Partial<Omit<Meeting, 'id'>>): Promise<Meeting> => {
  await new Promise(res => setTimeout(res, 1000));
  const meetingIndex = meetings.findIndex(m => m.id === id);
  if (meetingIndex === -1) {
    throw new Error("Meeting not found");
  }
  meetings[meetingIndex] = { ...meetings[meetingIndex], ...data };
  return meetings[meetingIndex];
}

export const deleteMeeting = async (id: string): Promise<{ success: boolean }> => {
  await new Promise(res => setTimeout(res, 500));
  const initialLength = meetings.length;
  meetings = meetings.filter(m => m.id !== id);
  if (meetings.length === initialLength) {
    throw new Error("Meeting not found");
  }
  return { success: true };
}

export const getUsers = async (): Promise<User[]> => {
  await new Promise(res => setTimeout(res, 500));
  return users;
};

export const createUser = async (data: { name: string; email: string; role: 'admin' | 'member'}): Promise<User> => {
  await new Promise(res => setTimeout(res, 500));
  if (users.some(u => u.email === data.email)) {
    throw new Error('A user with this email already exists.');
  }
  const newUser: User = {
    id: `user-${Date.now()}`,
    name: data.name,
    email: data.email,
    role: data.role,
  };
  users.push(newUser);
  return newUser;
};

export const updateUserRole = async (id: string, role: 'admin' | 'member'): Promise<User> => {
    await new Promise(res => setTimeout(res, 500));
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        throw new Error("User not found");
    }
    users[userIndex].role = role;
    return users[userIndex];
}

export const deleteUserById = async (id: string): Promise<{ success: boolean }> => {
    await new Promise(res => setTimeout(res, 500));
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);
    if (users.length === initialLength) {
        throw new Error("User not found");
    }
    return { success: true };
}
