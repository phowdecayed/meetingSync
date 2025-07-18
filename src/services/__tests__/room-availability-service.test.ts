/**
 * Room Availability Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  MeetingType,
  ConflictType,
  ConflictSeverity,
} from '@/types/conflict-detection'

// Mock Prisma using vi.hoisted to avoid hoisting issues
const mockPrisma = vi.hoisted(() => ({
  meetingRoom: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  meeting: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}))

// Import after mocking
const { RoomAvailabilityServiceImpl } = await import(
  '../room-availability-service'
)

describe('RoomAvailabilityService', () => {
  let service: RoomAvailabilityServiceImpl

  beforeEach(() => {
    service = new RoomAvailabilityServiceImpl()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('checkRoomAvailability', () => {
    it('should return available when no conflicts exist', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      mockPrisma.meeting.findMany.mockResolvedValue([])

      const result = await service.checkRoomAvailability(
        roomId,
        startTime,
        endTime,
      )

      expect(result.isAvailable).toBe(true)
      expect(result.conflictingMeetings).toHaveLength(0)
      expect(result.alternativeRooms).toHaveLength(0)
    })

    it('should return conflicts when room is booked', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      // Mock findMany for alternative rooms (empty array)
      mockPrisma.meetingRoom.findMany.mockResolvedValue([])

      const conflictingMeeting = {
        id: 'meeting-1',
        title: 'Existing Meeting',
        date: new Date('2024-01-15T10:30:00Z'),
        duration: 60,
        participants: 'user1@example.com, user2@example.com',
        organizer: { name: 'John Doe' },
        meetingRoom: { name: 'Conference Room A' },
        zoomCredentialId: null,
      }

      mockPrisma.meeting.findMany.mockResolvedValue([conflictingMeeting])

      const result = await service.checkRoomAvailability(
        roomId,
        startTime,
        endTime,
      )

      expect(result.isAvailable).toBe(false)
      expect(result.conflictingMeetings).toHaveLength(1)
      expect(result.conflictingMeetings[0].title).toBe('Existing Meeting')
    })

    it('should exclude specified meeting when checking availability', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')
      const excludeMeetingId = 'meeting-to-exclude'

      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      mockPrisma.meeting.findMany.mockResolvedValue([])

      await service.checkRoomAvailability(
        roomId,
        startTime,
        endTime,
        excludeMeetingId,
      )

      expect(mockPrisma.meeting.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: { not: excludeMeetingId },
        }),
        include: expect.any(Object),
      })
    })

    it('should throw error when room not found', async () => {
      const roomId = 'non-existent-room'
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.meetingRoom.findUnique.mockResolvedValue(null)

      await expect(
        service.checkRoomAvailability(roomId, startTime, endTime),
      ).rejects.toThrow('Room with ID non-existent-room not found')
    })
  })

  describe('findAvailableRooms', () => {
    it('should return all rooms when none are booked', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      const mockRooms = [
        {
          id: 'room-1',
          name: 'Conference Room A',
          capacity: 10,
          location: 'Floor 1',
        },
        {
          id: 'room-2',
          name: 'Conference Room B',
          capacity: 8,
          location: 'Floor 2',
        },
      ]

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const result = await service.findAvailableRooms(startTime, endTime)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Conference Room A')
      expect(result[1].name).toBe('Conference Room B')
    })

    it('should exclude rooms with conflicts', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      const mockRooms = [
        {
          id: 'room-1',
          name: 'Conference Room A',
          capacity: 10,
          location: 'Floor 1',
        },
        {
          id: 'room-2',
          name: 'Conference Room B',
          capacity: 8,
          location: 'Floor 2',
        },
      ]

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)

      // Mock conflicts for room-1 only
      mockPrisma.meeting.findMany
        .mockResolvedValueOnce([
          {
            id: 'meeting-1',
            title: 'Existing Meeting',
            date: new Date('2024-01-15T10:30:00Z'),
            duration: 60,
            participants: 'user1@example.com',
            organizer: { name: 'John Doe' },
            meetingRoom: { name: 'Conference Room A' },
            zoomCredentialId: null,
          },
        ])
        .mockResolvedValueOnce([]) // No conflicts for room-2

      const result = await service.findAvailableRooms(startTime, endTime)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Conference Room B')
    })
  })

  describe('validateRoomRequirement', () => {
    it('should require room for offline meetings', () => {
      const conflicts = service.validateRoomRequirement(MeetingType.OFFLINE)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe(ConflictType.MISSING_ROOM)
      expect(conflicts[0].severity).toBe(ConflictSeverity.ERROR)
    })

    it('should not require room for offline meetings when room is provided', () => {
      const conflicts = service.validateRoomRequirement(
        MeetingType.OFFLINE,
        'room-1',
      )

      expect(conflicts).toHaveLength(0)
    })

    it('should warn about missing room for hybrid meetings', () => {
      const conflicts = service.validateRoomRequirement(MeetingType.HYBRID)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe(ConflictType.MISSING_ROOM)
      expect(conflicts[0].severity).toBe(ConflictSeverity.WARNING)
    })

    it('should not require room for online meetings', () => {
      const conflicts = service.validateRoomRequirement(MeetingType.ONLINE)

      expect(conflicts).toHaveLength(0)
    })
  })

  describe('findOptimalRooms', () => {
    it('should score rooms based on capacity and location', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')
      const participantCount = 6
      const preferredLocation = 'Floor 1'

      const mockRooms = [
        {
          id: 'room-1',
          name: 'Small Room',
          capacity: 4,
          location: 'Floor 1',
        },
        {
          id: 'room-2',
          name: 'Perfect Room',
          capacity: 8,
          location: 'Floor 1',
        },
        {
          id: 'room-3',
          name: 'Large Room',
          capacity: 20,
          location: 'Floor 2',
        },
      ]

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const result = await service.findOptimalRooms(
        startTime,
        endTime,
        participantCount,
        preferredLocation,
      )

      // Should include all available rooms but prioritize room-2 (perfect fit + preferred location)
      expect(result).toHaveLength(3) // All rooms are available, but scored differently
      expect(result[0].name).toBe('Perfect Room') // Best match should be first
    })
  })

  describe('getRoomUtilization', () => {
    it('should calculate room utilization correctly', async () => {
      const roomId = 'room-1'
      const startDate = new Date('2024-01-15T00:00:00Z')
      const endDate = new Date('2024-01-16T23:59:59Z')

      const mockMeetings = [
        {
          id: 'meeting-1',
          duration: 60, // 1 hour
        },
        {
          id: 'meeting-2',
          duration: 120, // 2 hours
        },
      ]

      mockPrisma.meeting.findMany.mockResolvedValue(mockMeetings)

      const result = await service.getRoomUtilization(
        roomId,
        startDate,
        endDate,
      )

      expect(result.bookedHours).toBe(3) // 1 + 2 hours
      expect(result.meetingCount).toBe(2)
      expect(result.totalHours).toBe(16) // 2 days * 8 hours
      expect(result.utilizationPercentage).toBe(18.75) // 3/16 * 100
    })
  })
})
