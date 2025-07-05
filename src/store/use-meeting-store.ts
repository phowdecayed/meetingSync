import { create } from 'zustand';
import { type Meeting, createMeeting as apiCreate, updateMeeting as apiUpdate, deleteMeeting as apiDelete } from '@/lib/data';

type MeetingState = {
  meetings: Meeting[];
  setMeetings: (meetings: Meeting[]) => void;
  addMeeting: (data: Omit<Meeting, 'id' | 'zoomAccountId'>) => Promise<Meeting>;
  updateMeeting: (id: string, data: Partial<Omit<Meeting, 'id'>>) => Promise<Meeting>;
  deleteMeeting: (id: string) => Promise<void>;
};

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  setMeetings: (meetings) => set({ meetings }),
  addMeeting: async (data) => {
    const newMeeting = await apiCreate(data);
    set((state) => ({ meetings: [...state.meetings, newMeeting] }));
    return newMeeting;
  },
  updateMeeting: async (id, data) => {
    const updatedMeeting = await apiUpdate(id, data);
    set((state) => ({
      meetings: state.meetings.map((m) => (m.id === id ? updatedMeeting : m)),
    }));
    return updatedMeeting;
  },
  deleteMeeting: async (id) => {
    await apiDelete(id);
    set((state) => ({
      meetings: state.meetings.filter((m) => m.id !== id),
    }));
  },
}));
