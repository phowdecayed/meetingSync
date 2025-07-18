/**
 * Room Conflict Detection and Suggestion Generation Tests
 *
 * Comprehensive tests for room availability checking and conflict resolution including:
 * - Complex room booking scenarios
 * - Optimal room suggestion algorithms
 * - Room utilization patterns
 * - Conflict resolution strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { RoomAvailabilityServiceImpl } from '../room-availability-service'
import { conflictResolutionService } from '../conflict-resolution-service'
import {
  MeetingType,
  ConflictType,
  ConflictSeverity,
  SuggestionType,
  ConflictSuggestion,
  MeetingFormData,
} from '@/types/conflict-detection'
import prisma from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    meetingRoom: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    meeting: {
      findMany: vi.fn(),
    },
  },
}))

const mockPrisma = prisma as unknown as {
  meetingRoom: { findUnique: Mock; findMany: Mock }
  meeting: { findMany: Mock }
}

describe('Room Conflict Detection and Suggestion Generation', () => {
  let service: RoomAvailabilityServiceImpl

  beforeEach(() => {
    service = new RoomAvailabilityServiceImpl()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Complex Room Booking Scenarios', () => {
    it('should handle multiple overlapping meetings in same room', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T12:00:00Z') // 2-hour meeting

      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      // Multiple overlapping meetings
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Morning Standup',
          date: new Date('2024-01-15T09:30:00Z'),
          duration: 60, // 09:30-10:30 (overlaps start)
          participants: 'team1@example.com',
          organizer: { name: 'Alice' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
        {
          id: 'meeting-2',
          title: 'Project Review',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 90, // 10:30-12:00 (overlaps middle)
          participants: 'team2@example.com',
          organizer: { name: 'Bob' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
        {
          id: 'meeting-3',
          title: 'Client Call',
          date: new Date('2024-01-15T11:30:00Z'),
          duration: 90, // 11:30-13:00 (overlaps end)
          participants: 'client@example.com',
          organizer: { name: 'Charlie' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
        {
          id: 'meeting-4',
          title: 'All Day Workshop',
          date: new Date('2024-01-15T08:00:00Z'),
          duration: 480, // 08:00-16:00 (contains our meeting)
          participants: 'workshop@example.com',
          organizer: { name: 'Diana' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
      ])

      const result = await service.checkRoomAvailability(
        roomId,
        startTime,
        endTime,
      )

      expect(result.isAvailable).toBe(false)
      expect(result.conflictingMeetings).toHaveLength(4) // All meetings overlap

      // Verify each conflict is properly identified
      const conflictTitles = result.conflictingMeetings.map((m) => m.title)
      expect(conflictTitles).toContain('Morning Standup')
      expect(conflictTitles).toContain('Project Review')
      expect(conflictTitles).toContain('Client Call')
      expect(conflictTitles).toContain('All Day Workshop')
    })

    it('should handle edge case time boundaries', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-before',
          title: 'Meeting Before',
          date: new Date('2024-01-15T09:00:00Z'),
          duration: 60, // 09:00-10:00 (ends exactly when ours starts)
          participants: 'user1@example.com',
          organizer: { name: 'User 1' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
        {
          id: 'meeting-after',
          title: 'Meeting After',
          date: new Date('2024-01-15T11:00:00Z'),
          duration: 60, // 11:00-12:00 (starts exactly when ours ends)
          participants: 'user2@example.com',
          organizer: { name: 'User 2' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
      ])

      const result = await service.checkRoomAvailability(
        roomId,
        startTime,
        endTime,
      )

      // Should be available - no actual overlap at boundaries
      expect(result.isAvailable).toBe(true)
      expect(result.conflictingMeetings).toHaveLength(0)
    })

    it('should handle recurring meeting patterns', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T10:00:00Z') // Monday
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      // Simulate weekly recurring meeting
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'recurring-meeting',
          title: 'Weekly Team Meeting',
          date: new Date('2024-01-15T10:00:00Z'), // Same time, same day
          duration: 60,
          participants: 'team@example.com',
          organizer: { name: 'Team Lead' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
      ])

      const result = await service.checkRoomAvailability(
        roomId,
        startTime,
        endTime,
      )

      expect(result.isAvailable).toBe(false)
      expect(result.conflictingMeetings).toHaveLength(1)
      expect(result.conflictingMeetings[0].title).toBe('Weekly Team Meeting')
    })

    it('should exclude specified meeting from conflict check', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')
      const excludeMeetingId = 'my-meeting'

      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'other-meeting',
          title: 'Other Meeting',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60,
          participants: 'other@example.com',
          organizer: { name: 'Other User' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
      ])

      const result = await service.checkRoomAvailability(
        roomId,
        startTime,
        endTime,
        excludeMeetingId,
      )

      // Should properly exclude the specified meeting
      expect(mockPrisma.meeting.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: { not: excludeMeetingId },
        }),
        include: expect.any(Object),
      })

      expect(result.isAvailable).toBe(false)
      expect(result.conflictingMeetings).toHaveLength(1)
      expect(result.conflictingMeetings[0].id).toBe('other-meeting')
    })
  })

  describe('Optimal Room Suggestion Algorithms', () => {
    it('should prioritize rooms by capacity match', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')
      const participantCount = 6
      const preferredLocation = 'Floor 1'

      const mockRooms = [
        {
          id: 'room-too-small',
          name: 'Small Room',
          capacity: 4, // Too small
          location: 'Floor 1',
        },
        {
          id: 'room-perfect',
          name: 'Perfect Room',
          capacity: 8, // Just right (6 + buffer)
          location: 'Floor 1',
        },
        {
          id: 'room-good',
          name: 'Good Room',
          capacity: 10, // Good size
          location: 'Floor 1',
        },
        {
          id: 'room-too-large',
          name: 'Large Room',
          capacity: 50, // Too large
          location: 'Floor 1',
        },
      ]

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)
      mockPrisma.meeting.findMany.mockResolvedValue([]) // No conflicts

      const result = await service.findOptimalRooms(
        startTime,
        endTime,
        participantCount,
        preferredLocation,
      )

      expect(result.length).toBeGreaterThan(0)

      // Perfect room should be ranked highly
      const perfectRoomIndex = result.findIndex((r) => r.id === 'room-perfect')
      const goodRoomIndex = result.findIndex((r) => r.id === 'room-good')
      const tooLargeRoomIndex = result.findIndex(
        (r) => r.id === 'room-too-large',
      )

      expect(perfectRoomIndex).toBeLessThan(goodRoomIndex)
      expect(goodRoomIndex).toBeLessThan(tooLargeRoomIndex)

      // Too small room should be excluded or ranked last
      const tooSmallRoom = result.find((r) => r.id === 'room-too-small')
      expect(tooSmallRoom).toBeUndefined() // Should be filtered out
    })

    it('should prioritize rooms by location preference', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')
      const participantCount = 6
      const preferredLocation = 'Floor 1'

      const mockRooms = [
        {
          id: 'room-preferred-location',
          name: 'Room on Preferred Floor',
          capacity: 8,
          location: 'Floor 1', // Preferred location
        },
        {
          id: 'room-other-location',
          name: 'Room on Other Floor',
          capacity: 8, // Same capacity
          location: 'Floor 2', // Different location
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

      expect(result.length).toBe(2)

      // Preferred location should be first
      expect(result[0].id).toBe('room-preferred-location')
      expect(result[1].id).toBe('room-other-location')
    })

    it('should handle equipment requirements in suggestions', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')
      const participantCount = 6

      const mockRooms = [
        {
          id: 'room-basic',
          name: 'Basic Room',
          capacity: 8,
          location: 'Floor 1',
          equipment: [],
        },
        {
          id: 'room-with-projector',
          name: 'Room with Projector',
          capacity: 8,
          location: 'Floor 1',
          equipment: ['projector'],
        },
        {
          id: 'room-fully-equipped',
          name: 'Fully Equipped Room',
          capacity: 8,
          location: 'Floor 1',
          equipment: ['projector', 'whiteboard', 'video-conference'],
        },
      ]

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const result = await service.findOptimalRooms(
        startTime,
        endTime,
        participantCount,
      )

      expect(result.length).toBe(3)

      // Rooms with more equipment should be ranked higher (assuming they're more versatile)
      const fullyEquippedIndex = result.findIndex(
        (r) => r.id === 'room-fully-equipped',
      )
      const projectorIndex = result.findIndex(
        (r) => r.id === 'room-with-projector',
      )
      const basicIndex = result.findIndex((r) => r.id === 'room-basic')

      expect(fullyEquippedIndex).toBeLessThan(projectorIndex)
      expect(projectorIndex).toBeLessThan(basicIndex)
    })

    it('should filter out unavailable rooms', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')
      const participantCount = 6

      const mockRooms = [
        {
          id: 'room-available',
          name: 'Available Room',
          capacity: 8,
          location: 'Floor 1',
        },
        {
          id: 'room-conflicted',
          name: 'Conflicted Room',
          capacity: 8,
          location: 'Floor 1',
        },
      ]

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)

      // Mock conflicts for room-conflicted only
      mockPrisma.meeting.findMany
        .mockResolvedValueOnce([]) // No conflicts for room-available
        .mockResolvedValueOnce([
          {
            id: 'conflict-meeting',
            title: 'Conflicting Meeting',
            date: new Date('2024-01-15T10:30:00Z'),
            duration: 60,
            participants: 'user@example.com',
            organizer: { name: 'User' },
            meetingRoom: { name: 'Conflicted Room' },
            zoomCredentialId: null,
          },
        ]) // Conflict for room-conflicted

      const result = await service.findOptimalRooms(
        startTime,
        endTime,
        participantCount,
      )

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('room-available')
    })
  })

  describe('Room Utilization Patterns', () => {
    it('should calculate accurate utilization statistics', async () => {
      const roomId = 'room-1'
      const startDate = new Date('2024-01-15T00:00:00Z')
      const endDate = new Date('2024-01-16T23:59:59Z') // 2 days

      const mockMeetings = [
        {
          id: 'meeting-1',
          duration: 60, // 1 hour
        },
        {
          id: 'meeting-2',
          duration: 120, // 2 hours
        },
        {
          id: 'meeting-3',
          duration: 30, // 0.5 hours
        },
      ]

      mockPrisma.meeting.findMany.mockResolvedValue(mockMeetings)

      const result = await service.getRoomUtilization(
        roomId,
        startDate,
        endDate,
      )

      expect(result.bookedHours).toBe(3.5) // 1 + 2 + 0.5 hours
      expect(result.meetingCount).toBe(3)
      expect(result.totalHours).toBe(32) // 2 days × 16 hours (8 AM - 12 AM)
      expect(result.utilizationPercentage).toBeCloseTo(10.94, 2) // 3.5/32 * 100
    })

    it('should handle different time ranges for utilization', async () => {
      const roomId = 'room-1'

      // Test single day
      const singleDayStart = new Date('2024-01-15T00:00:00Z')
      const singleDayEnd = new Date('2024-01-15T23:59:59Z')

      mockPrisma.meeting.findMany.mockResolvedValue([
        { id: 'meeting-1', duration: 120 }, // 2 hours
      ])

      const singleDayResult = await service.getRoomUtilization(
        roomId,
        singleDayStart,
        singleDayEnd,
      )

      expect(singleDayResult.totalHours).toBe(16) // 1 day × 16 hours
      expect(singleDayResult.utilizationPercentage).toBe(12.5) // 2/16 * 100

      // Test week
      const weekStart = new Date('2024-01-15T00:00:00Z') // Monday
      const weekEnd = new Date('2024-01-21T23:59:59Z') // Sunday

      const weekResult = await service.getRoomUtilization(
        roomId,
        weekStart,
        weekEnd,
      )

      expect(weekResult.totalHours).toBe(112) // 7 days × 16 hours
      expect(weekResult.utilizationPercentage).toBeCloseTo(1.79, 2) // 2/112 * 100
    })

    it('should handle edge cases in utilization calculation', async () => {
      const roomId = 'room-1'
      const startDate = new Date('2024-01-15T00:00:00Z')
      const endDate = new Date('2024-01-15T23:59:59Z')

      // Test with no meetings
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const noMeetingsResult = await service.getRoomUtilization(
        roomId,
        startDate,
        endDate,
      )

      expect(noMeetingsResult.bookedHours).toBe(0)
      expect(noMeetingsResult.meetingCount).toBe(0)
      expect(noMeetingsResult.utilizationPercentage).toBe(0)

      // Test with very long meetings
      mockPrisma.meeting.findMany.mockResolvedValue([
        { id: 'all-day', duration: 960 }, // 16 hours (full business day)
      ])

      const fullDayResult = await service.getRoomUtilization(
        roomId,
        startDate,
        endDate,
      )

      expect(fullDayResult.bookedHours).toBe(16)
      expect(fullDayResult.utilizationPercentage).toBe(100)
    })
  })

  describe('Conflict Resolution Strategies', () => {
    it('should generate comprehensive room conflict suggestions', async () => {
      const conflicts = [
        {
          type: ConflictType.ROOM_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Conference Room A is already booked from 10:30-11:30',
          affectedResource: 'room-1',
          suggestions: [
            'Use Conference Room B instead',
            'Use Meeting Room C instead',
            'Schedule at 12:00 (after conflicts)',
            'Schedule at 09:00 (before conflicts)',
          ],
        },
      ]

      const meetingData = {
        title: 'Team Meeting',
        date: new Date('2024-01-15T00:00:00Z'),
        time: '10:00',
        duration: 60,
        meetingType: MeetingType.OFFLINE,
        isZoomMeeting: false,
        meetingRoomId: 'room-1',
        participants: ['user1@example.com', 'user2@example.com'],
        description: 'Team meeting',
      }

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          meetingData,
        )

      expect(suggestions.length).toBeGreaterThan(0)

      // Should have room change suggestions
      const roomSuggestions = suggestions.filter(
        (s: ConflictSuggestion) => s.type === SuggestionType.ROOM_CHANGE,
      )
      expect(roomSuggestions.length).toBeGreaterThan(0)

      // Should have time change suggestions
      const timeSuggestions = suggestions.filter(
        (s: ConflictSuggestion) => s.type === SuggestionType.TIME_CHANGE,
      )
      expect(timeSuggestions.length).toBeGreaterThan(0)

      // Verify specific suggestions
      expect(
        roomSuggestions.some((s: ConflictSuggestion) =>
          s.description.includes('Conference Room B'),
        ),
      ).toBe(true)
      expect(
        timeSuggestions.some((s: ConflictSuggestion) =>
          s.description.includes('12:00'),
        ),
      ).toBe(true)
    })

    it('should prioritize suggestions by feasibility', async () => {
      const conflicts = [
        {
          type: ConflictType.ROOM_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Room conflict',
          affectedResource: 'room-1',
          suggestions: [
            'Use Conference Room B instead',
            'Use Meeting Room C instead',
            'Schedule at 14:00',
          ],
        },
      ]

      const meetingData = {
        title: 'Team Meeting',
        date: new Date('2024-01-15T00:00:00Z'),
        time: '10:00',
        duration: 60,
        meetingType: MeetingType.OFFLINE,
        isZoomMeeting: false,
        meetingRoomId: 'room-1',
        participants: ['user1@example.com', 'user2@example.com'],
        description: 'Team meeting',
      }

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          meetingData,
        )
      const prioritized =
        conflictResolutionService.prioritizeSuggestions(suggestions)

      expect(prioritized.length).toBeGreaterThan(0)

      // Room changes should generally have higher priority than time changes
      const firstSuggestion = prioritized[0]
      expect([
        SuggestionType.ROOM_CHANGE,
        SuggestionType.TIME_CHANGE,
      ]).toContain(firstSuggestion.type)

      // Verify priority ordering
      for (let i = 1; i < prioritized.length; i++) {
        expect(prioritized[i].priority).toBeGreaterThanOrEqual(
          prioritized[i - 1].priority,
        )
      }
    })

    it('should handle missing room suggestions', async () => {
      const conflicts = [
        {
          type: ConflictType.MISSING_ROOM,
          severity: ConflictSeverity.ERROR,
          message: 'Offline meetings require a physical room',
          suggestions: ['Select a meeting room from the dropdown'],
        },
      ]

      const meetingData = {
        title: 'Team Meeting',
        date: new Date('2024-01-15T00:00:00Z'),
        time: '10:00',
        duration: 60,
        meetingType: MeetingType.OFFLINE,
        isZoomMeeting: false,
        meetingRoomId: undefined, // No room selected
        participants: ['user1@example.com', 'user2@example.com'],
        description: 'Team meeting',
      }

      // Mock available rooms for suggestions
      mockPrisma.meetingRoom.findMany.mockResolvedValue([
        {
          id: 'room-2',
          name: 'Conference Room B',
          capacity: 8,
          location: 'Floor 2',
        },
        {
          id: 'room-3',
          name: 'Meeting Room C',
          capacity: 6,
          location: 'Floor 1',
        },
      ])

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          meetingData,
        )

      expect(suggestions.length).toBeGreaterThan(0)

      // Should have room selection suggestions
      const roomSuggestions = suggestions.filter(
        (s: ConflictSuggestion) => s.type === SuggestionType.ROOM_CHANGE,
      )
      expect(roomSuggestions.length).toBeGreaterThan(0)

      // Should also suggest changing meeting type to online
      const typeSuggestions = suggestions.filter(
        (s: ConflictSuggestion) => s.type === SuggestionType.TYPE_CHANGE,
      )
      expect(typeSuggestions.length).toBeGreaterThan(0)
      expect(
        typeSuggestions.some(
          (s: ConflictSuggestion) => s.action.value === MeetingType.ONLINE,
        ),
      ).toBe(true)
    })

    it('should apply room suggestions correctly', () => {
      const roomSuggestion = {
        id: 'suggestion-1',
        type: SuggestionType.ROOM_CHANGE,
        description: 'Use Conference Room B instead',
        action: {
          field: 'meetingRoomId' as const,
          value: 'room-2',
          additionalChanges: {},
        },
        priority: 1,
      }

      const changes = conflictResolutionService.applySuggestion(roomSuggestion)

      expect(changes).toEqual({
        meetingRoomId: 'room-2',
      })
    })

    it('should handle complex multi-room conflict scenarios', async () => {
      // Simulate a scenario where multiple rooms have conflicts
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
          location: 'Floor 1',
        },
        {
          id: 'room-3',
          name: 'Meeting Room C',
          capacity: 6,
          location: 'Floor 2',
        },
      ]

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)

      // Mock conflicts for room-1 and room-2, but not room-3
      mockPrisma.meeting.findMany
        .mockResolvedValueOnce([
          {
            id: 'conflict-1',
            title: 'Conflict in Room A',
            date: new Date('2024-01-15T10:30:00Z'),
            duration: 60,
            participants: 'user1@example.com',
            organizer: { name: 'User 1' },
            meetingRoom: { name: 'Conference Room A' },
            zoomCredentialId: null,
          },
        ]) // room-1 has conflict
        .mockResolvedValueOnce([
          {
            id: 'conflict-2',
            title: 'Conflict in Room B',
            date: new Date('2024-01-15T10:15:00Z'),
            duration: 90,
            participants: 'user2@example.com',
            organizer: { name: 'User 2' },
            meetingRoom: { name: 'Conference Room B' },
            zoomCredentialId: null,
          },
        ]) // room-2 has conflict
        .mockResolvedValueOnce([]) // room-3 has no conflict

      const availableRooms = await service.findAvailableRooms(
        startTime,
        endTime,
      )

      expect(availableRooms).toHaveLength(1)
      expect(availableRooms[0].id).toBe('room-3')
      expect(availableRooms[0].name).toBe('Meeting Room C')
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of rooms efficiently', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      // Generate 100 mock rooms
      const mockRooms = Array.from({ length: 100 }, (_, i) => ({
        id: `room-${i}`,
        name: `Room ${i}`,
        capacity: 8 + (i % 10), // Varying capacities
        location: `Floor ${Math.floor(i / 20) + 1}`, // 20 rooms per floor
      }))

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)
      mockPrisma.meeting.findMany.mockResolvedValue([]) // No conflicts

      const start = Date.now()
      const result = await service.findAvailableRooms(startTime, endTime)
      const duration = Date.now() - start

      expect(result).toHaveLength(100)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle rooms with null/undefined properties', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      const mockRooms = [
        {
          id: 'room-1',
          name: 'Normal Room',
          capacity: 8,
          location: 'Floor 1',
        },
        {
          id: 'room-2',
          name: null, // Null name
          capacity: 10,
          location: 'Floor 2',
        },
        {
          id: 'room-3',
          name: 'Room with No Location',
          capacity: 6,
          location: null, // Null location
        },
      ]

      mockPrisma.meetingRoom.findMany.mockResolvedValue(mockRooms)
      mockPrisma.meeting.findMany.mockResolvedValue([])

      // Should handle gracefully without crashing
      const result = await service.findAvailableRooms(startTime, endTime)

      expect(result).toHaveLength(3)
      expect(result.some((r) => r.id === 'room-1')).toBe(true)
      expect(result.some((r) => r.id === 'room-2')).toBe(true)
      expect(result.some((r) => r.id === 'room-3')).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.meetingRoom.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      )

      await expect(
        service.checkRoomAvailability(roomId, startTime, endTime),
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle invalid date ranges', async () => {
      const roomId = 'room-1'
      const startTime = new Date('2024-01-15T11:00:00Z')
      const endTime = new Date('2024-01-15T10:00:00Z') // End before start

      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: roomId,
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      mockPrisma.meeting.findMany.mockResolvedValue([])

      // Should handle gracefully
      const result = await service.checkRoomAvailability(
        roomId,
        startTime,
        endTime,
      )

      expect(result).toBeDefined()
      expect(result.isAvailable).toBe(true) // No conflicts found due to invalid range
    })
  })
})
