'use client'

import { create } from 'zustand'
import { type Meeting } from '@/lib/data'

type MeetingStore = {
  meetings: Meeting[]
  setMeetings: (meetings: Meeting[]) => void
  addMeeting: (meeting: Omit<Meeting, 'id'>) => Promise<Meeting>
  updateMeeting: (
    id: string,
    meeting: Partial<Omit<Meeting, 'id'>>,
  ) => Promise<Meeting>
  deleteMeeting: (id: string) => Promise<boolean>
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: [],

  setMeetings: (meetings) => set({ meetings }),

  addMeeting: async (meetingData) => {
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData),
      })

      const result = await response.json()

      if (!response.ok) {
        // Throw a new error with the specific message from the server
        throw new Error(result.error || 'Failed to create meeting')
      }

      set((state) => ({
        meetings: [...state.meetings, result],
      }))

      return result
    } catch (error) {
      console.error('Error adding meeting:', error)
      // Re-throw the error so the component can catch it
      throw error
    }
  },

  updateMeeting: async (id, meetingData) => {
    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update meeting')
      }

      const updatedMeeting = await response.json()

      set((state) => ({
        meetings: state.meetings.map((meeting) =>
          meeting.id === id ? updatedMeeting : meeting,
        ),
      }))

      return updatedMeeting
    } catch (error) {
      console.error('Error updating meeting:', error)
      throw error
    }
  },

  deleteMeeting: async (id) => {
    try {
      const response = await fetch(`/api/meetings?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete meeting')
      }

      const result = await response.json()

      if (result.success) {
        set((state) => ({
          meetings: state.meetings.filter((meeting) => meeting.id !== id),
        }))
      }

      return result.success
    } catch (error) {
      console.error('Error deleting meeting:', error)
      throw error
    }
  },
}))
