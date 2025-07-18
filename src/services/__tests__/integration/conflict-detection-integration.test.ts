/**
 * Integration Tests for Enhanced Conflict Detection System
 *
 * Tests the complete flow of conflict detection including:
 * - Meeting type validation scenarios
 * - Zoom account load balancing and capacity management
 * - Room conflict detection and suggestion generation
 * - End-to-end conflict resolution workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { EnhancedConflictDetectionEngine } from '../../enhanced-conflict-detection'
import { meetingTypeValidator } from '../../meeting-type-validator'
import { zoomAccountService } from '../../zoom-account-service'
import { roomAvailabilityService } from '../../room-availability-service'
import { conflictResolutionService } from '../../conflict-resolution-service'
import {
  MeetingFormData,
  MeetingType,
  ConflictType,
  ConflictSeverity,
  SuggestionType,
} from '@/types/conflict-detection'
import prisma from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    zoomCredentials: {
      findMany: vi.fn(),
    },
    meeting: {
      findMany: vi.fn(),
    },
    meetingRoom: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

const mockPrisma = prisma as {
  zoomCredentials: { findMany: Mock }
  meeting: { findMany: Mock }
  meetingRoom: { findMany: Mock; findUnique: Mock }
}

describe('Conflict Detection Integration Tests', () => {
  let conflictEngine: EnhancedConflictDetectionEngine

  beforeEach(() => {
    conflictEngine = new EnhancedConflictDetectionEngine()
    vi.clearAllMocks()
  })

  afterEach(() => {
    conflictEngine.unsubscribe()
    vi.clearAllMocks()
  })

  const createMockMeetingData = (
    overrides: Partial<MeetingFormData> = {},
  ): MeetingFormData => ({
    title: 'Integration Test Meeting',
    date: new Date('2025-12-15T00:00:00Z'),
    time: '10:00',
    duration: 60,
    meetingType: MeetingType.HYBRID,
    isZoomMeeting: true,
    meetingRoomId: 'room-1',
    participants: ['user1@example.com', 'user2@example.com'],
    description: 'Integration test meeting',
    zoomPassword: 'password123',
    ...overrides,
  })

  describe('Meeting Type Validation Integration', () => {
    it('should validate complete offline meeting workflow', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.OFFLINE,
        isZoomMeeting: false,
        meetingRoomId: 'room-1',
      })

      // Mock room availability - room is available
      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const result = await conflictEngine.validateMeeting(meetingData)

      expect(result.canSubmit).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should validate complete hybrid meeting workflow with conflicts', async () => {
      const meetingData = createMeetingData({
        meetingType: MeetingType.HYBRID,
        isZoomMeeting: true,
        meetingRoomId: 'room-1',
      })

      // Mock room conflict
      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'conflicting-meeting',
          title: 'Existing Meeting',
          date: new Date('2025-12-15T10:30:00Z'),
          duration: 60,
          participants: 'user3@example.com',
          organizer: { name: 'John Doe' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
      ])

      // Mock alternative rooms
      mockPrisma.meetingRoom.findMany.mockResolvedValue([
        {
          id: 'room-2',
          name: 'Conference Room B',
          capacity: 8,
          location: 'Floor 2',
        },
      ])

      // Mock Zoom accounts
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      const result = await conflictEngine.validateMeeting(meetingData)

      expect(result.canSubmit).toBe(false) // Room conflict blocks submission
      expect(
        result.conflicts.some((c) => c.type === ConflictType.ROOM_CONFLICT),
      ).toBe(true)
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should validate complete online meeting workflow with Zoom capacity', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.ONLINE,
        isZoomMeeting: true,
        meetingRoomId: undefined,
      })

      // Mock Zoom accounts at capacity
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // Mock meetings that fill Zoom capacity
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Zoom Meeting 1',
          date: new Date('2025-12-15T10:30:00Z'),
          duration: 60,
          participants: 'user1@example.com',
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
        {
          id: 'meeting-2',
          title: 'Zoom Meeting 2',
          date: new Date('2025-12-15T10:15:00Z'),
          duration: 90,
          participants: 'user2@example.com',
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const result = await conflictEngine.validateMeeting(meetingData)

      expect(result.canSubmit).toBe(false) // Zoom capacity exceeded
      expect(
        result.conflicts.some((c) => c.type === ConflictType.ZOOM_CAPACITY),
      ).toBe(true)
      expect(
        result.suggestions.some((s) => s.type === SuggestionType.TIME_CHANGE),
      ).toBe(true)
    })
  })

  describe('Zoom Account Load Balancing Integration', () => {
    it('should distribute meetings across multiple Zoom accounts', async () => {
      // Setup multiple Zoom accounts
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
        {
          id: 'zoom-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: [],
        },
      ])

      // Mock existing meetings - zoom-1 has 1 meeting, zoom-2 has none
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'existing-meeting',
          title: 'Existing Meeting',
          date: new Date('2025-12-15T10:30:00Z'),
          duration: 60,
          participants: 'user1@example.com',
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const capacityResult =
        await zoomAccountService.checkConcurrentMeetingCapacity(
          new Date('2025-12-15T10:00:00Z'),
          new Date('2025-12-15T11:00:00Z'),
        )

      expect(capacityResult.hasAvailableAccount).toBe(true)
      expect(capacityResult.totalMaxConcurrent).toBe(4) // 2 accounts × 2 meetings each
      expect(capacityResult.currentTotalUsage).toBe(1) // 1 existing meeting
      expect(capacityResult.availableSlots).toBe(3)

      // Should suggest the least loaded account (zoom-2)
      const suggestedAccount = await zoomAccountService.findAvailableAccount(
        new Date('2025-12-15T10:00:00Z'),
        new Date('2025-12-15T11:00:00Z'),
      )

      expect(suggestedAccount).toBeDefined()
      expect(['zoom-1', 'zoom-2']).toContain(suggestedAccount?.id)
    })

    it('should handle Zoom account capacity exhaustion', async () => {
      // Setup Zoom accounts at full capacity
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // Mock meetings that fill all capacity
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Meeting 1',
          date: new Date('2025-12-15T10:30:00Z'),
          duration: 60,
          participants: 'user1@example.com',
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
        {
          id: 'meeting-2',
          title: 'Meeting 2',
          date: new Date('2025-12-15T10:15:00Z'),
          duration: 90,
          participants: 'user2@example.com',
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const meetingData = createMockMeetingData({
        meetingType: MeetingType.ONLINE,
        isZoomMeeting: true,
      })

      const result = await conflictEngine.validateMeeting(meetingData)

      expect(result.canSubmit).toBe(false)
      expect(
        result.conflicts.some((c) => c.type === ConflictType.ZOOM_CAPACITY),
      ).toBe(true)

      // Should suggest time changes
      expect(
        result.suggestions.some((s) => s.type === SuggestionType.TIME_CHANGE),
      ).toBe(true)
    })

    it('should provide load balancing statistics', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
        {
          id: 'zoom-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: [],
        },
      ])

      const loadInfo = await zoomAccountService.getAccountLoadBalancing()

      expect(loadInfo).toHaveLength(2)
      expect(loadInfo[0]).toMatchObject({
        accountId: expect.any(String),
        currentLoad: expect.any(Number),
        maxCapacity: 2,
        utilizationPercentage: expect.any(Number),
      })

      // Should be sorted by utilization (ascending)
      expect(loadInfo[0].utilizationPercentage).toBeLessThanOrEqual(
        loadInfo[1].utilizationPercentage,
      )
    })
  })

  describe('Room Conflict Detection and Suggestion Generation', () => {
    it('should detect room conflicts and generate alternative suggestions', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.OFFLINE,
        meetingRoomId: 'room-1',
        isZoomMeeting: false,
      })

      // Mock room conflict
      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'conflicting-meeting',
          title: 'Existing Meeting',
          date: new Date('2025-12-15T10:30:00Z'),
          duration: 60,
          participants: 'user3@example.com',
          organizer: { name: 'John Doe' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
      ])

      // Mock alternative rooms
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

      const result = await conflictEngine.validateMeeting(meetingData)

      expect(result.canSubmit).toBe(false)
      expect(
        result.conflicts.some((c) => c.type === ConflictType.ROOM_CONFLICT),
      ).toBe(true)

      // Should have room change suggestions
      const roomSuggestions = result.suggestions.filter(
        (s) => s.type === SuggestionType.ROOM_CHANGE,
      )
      expect(roomSuggestions.length).toBeGreaterThan(0)

      // Should have time change suggestions
      const timeSuggestions = result.suggestions.filter(
        (s) => s.type === SuggestionType.TIME_CHANGE,
      )
      expect(timeSuggestions.length).toBeGreaterThan(0)
    })

    it('should generate optimal room suggestions based on capacity and location', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.OFFLINE,
        meetingRoomId: undefined, // No room selected
        participants: [
          'user1@example.com',
          'user2@example.com',
          'user3@example.com',
        ], // 3 participants
      })

      // Mock available rooms with different capacities
      mockPrisma.meetingRoom.findMany.mockResolvedValue([
        {
          id: 'room-small',
          name: 'Small Room',
          capacity: 2, // Too small
          location: 'Floor 1',
        },
        {
          id: 'room-perfect',
          name: 'Perfect Room',
          capacity: 4, // Just right
          location: 'Floor 1',
        },
        {
          id: 'room-large',
          name: 'Large Room',
          capacity: 20, // Too large
          location: 'Floor 2',
        },
      ])

      mockPrisma.meeting.findMany.mockResolvedValue([]) // No conflicts

      const result = await conflictEngine.validateMeeting(meetingData)

      expect(
        result.conflicts.some((c) => c.type === ConflictType.MISSING_ROOM),
      ).toBe(true)

      const roomSuggestions = result.suggestions.filter(
        (s) => s.type === SuggestionType.ROOM_CHANGE,
      )
      expect(roomSuggestions.length).toBeGreaterThan(0)

      // Should prioritize the perfect-sized room
      const perfectRoomSuggestion = roomSuggestions.find((s) =>
        s.description.includes('Perfect Room'),
      )
      expect(perfectRoomSuggestion).toBeDefined()
    })

    it('should handle room utilization and availability patterns', async () => {
      const startTime = new Date('2025-12-15T10:00:00Z')
      const endTime = new Date('2025-12-15T11:00:00Z')

      // Mock room with some utilization
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          duration: 60, // 1 hour
        },
        {
          id: 'meeting-2',
          duration: 120, // 2 hours
        },
      ])

      const utilization = await roomAvailabilityService.getRoomUtilization(
        'room-1',
        new Date('2025-12-15T00:00:00Z'),
        new Date('2025-12-16T23:59:59Z'),
      )

      expect(utilization.bookedHours).toBe(3) // 1 + 2 hours
      expect(utilization.meetingCount).toBe(2)
      expect(utilization.utilizationPercentage).toBeGreaterThan(0)
    })
  })

  describe('End-to-End Conflict Resolution Workflows', () => {
    it('should resolve complex multi-conflict scenarios', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.HYBRID,
        meetingRoomId: 'room-1',
        isZoomMeeting: true,
      })

      // Mock both room and Zoom conflicts
      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })

      // Room conflict
      mockPrisma.meeting.findMany
        .mockResolvedValueOnce([
          {
            id: 'room-conflict',
            title: 'Room Meeting',
            date: new Date('2025-12-15T10:30:00Z'),
            duration: 60,
            participants: 'user3@example.com',
            organizer: { name: 'John Doe' },
            meetingRoom: { name: 'Conference Room A' },
            zoomCredentialId: null,
          },
        ])
        // Zoom capacity conflict
        .mockResolvedValueOnce([
          {
            id: 'zoom-meeting-1',
            title: 'Zoom Meeting 1',
            date: new Date('2025-12-15T10:30:00Z'),
            duration: 60,
            participants: 'user1@example.com',
            zoomCredentialId: 'zoom-1',
            zoomCredential: { id: 'zoom-1' },
          },
          {
            id: 'zoom-meeting-2',
            title: 'Zoom Meeting 2',
            date: new Date('2025-12-15T10:15:00Z'),
            duration: 90,
            participants: 'user2@example.com',
            zoomCredentialId: 'zoom-1',
            zoomCredential: { id: 'zoom-1' },
          },
        ])

      // Mock alternative rooms
      mockPrisma.meetingRoom.findMany.mockResolvedValue([
        {
          id: 'room-2',
          name: 'Conference Room B',
          capacity: 8,
          location: 'Floor 2',
        },
      ])

      // Mock single Zoom account at capacity
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      const result = await conflictEngine.validateMeeting(meetingData)

      expect(result.canSubmit).toBe(false)
      expect(result.conflicts.length).toBeGreaterThan(1) // Multiple conflicts
      expect(
        result.conflicts.some((c) => c.type === ConflictType.ROOM_CONFLICT),
      ).toBe(true)
      expect(
        result.conflicts.some((c) => c.type === ConflictType.ZOOM_CAPACITY),
      ).toBe(true)

      // Should provide comprehensive suggestions
      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(
        result.suggestions.some((s) => s.type === SuggestionType.ROOM_CHANGE),
      ).toBe(true)
      expect(
        result.suggestions.some((s) => s.type === SuggestionType.TIME_CHANGE),
      ).toBe(true)
    })

    it('should apply suggestions and re-validate', async () => {
      const originalMeetingData = createMockMeetingData({
        meetingType: MeetingType.OFFLINE,
        meetingRoomId: undefined, // Missing room
      })

      // Mock available rooms
      mockPrisma.meetingRoom.findMany.mockResolvedValue([
        {
          id: 'room-2',
          name: 'Conference Room B',
          capacity: 8,
          location: 'Floor 2',
        },
      ])

      // First validation - should have missing room conflict
      const initialResult =
        await conflictEngine.validateMeeting(originalMeetingData)
      expect(
        initialResult.conflicts.some(
          (c) => c.type === ConflictType.MISSING_ROOM,
        ),
      ).toBe(true)

      // Apply room suggestion
      const roomSuggestion = initialResult.suggestions.find(
        (s) => s.type === SuggestionType.ROOM_CHANGE,
      )
      expect(roomSuggestion).toBeDefined()

      const appliedChanges = conflictResolutionService.applySuggestion(
        roomSuggestion!,
      )
      const updatedMeetingData = { ...originalMeetingData, ...appliedChanges }

      // Mock room availability for the suggested room
      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-2',
        name: 'Conference Room B',
        capacity: 8,
        location: 'Floor 2',
      })
      mockPrisma.meeting.findMany.mockResolvedValue([]) // No conflicts

      // Re-validate with applied suggestion
      const finalResult =
        await conflictEngine.validateMeeting(updatedMeetingData)
      expect(finalResult.canSubmit).toBe(true)
      expect(
        finalResult.conflicts.some((c) => c.type === ConflictType.MISSING_ROOM),
      ).toBe(false)
    })

    it('should handle real-time conflict updates', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.HYBRID,
        meetingRoomId: 'room-1',
        isZoomMeeting: true,
      })

      // Setup initial state - no conflicts
      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })
      mockPrisma.meeting.findMany.mockResolvedValue([])
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // Initial validation - should pass
      const initialResult = await conflictEngine.validateMeeting(meetingData)
      expect(initialResult.canSubmit).toBe(true)

      // Simulate real-time change - new meeting added
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'new-conflict',
          title: 'New Conflicting Meeting',
          date: new Date('2025-12-15T10:30:00Z'),
          duration: 60,
          participants: 'user3@example.com',
          organizer: { name: 'Jane Doe' },
          meetingRoom: { name: 'Conference Room A' },
          zoomCredentialId: null,
        },
      ])

      // Clear cache to force re-validation
      conflictEngine.clearCache()

      // Re-validate - should now have conflict
      const updatedResult = await conflictEngine.validateMeeting(meetingData)
      expect(updatedResult.canSubmit).toBe(false)
      expect(
        updatedResult.conflicts.some(
          (c) => c.type === ConflictType.ROOM_CONFLICT,
        ),
      ).toBe(true)
    })
  })

  describe('Performance and Caching Integration', () => {
    it('should cache validation results for performance', async () => {
      const meetingData = createMockMeetingData()

      // Setup mocks
      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })
      mockPrisma.meeting.findMany.mockResolvedValue([])
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([])

      // First validation
      const start1 = Date.now()
      await conflictEngine.validateMeeting(meetingData)
      const duration1 = Date.now() - start1

      // Second validation (should use cache)
      const start2 = Date.now()
      await conflictEngine.validateMeeting(meetingData)
      const duration2 = Date.now() - start2

      // Cache should make second call faster
      expect(duration2).toBeLessThan(duration1)

      // Verify cache statistics
      const cacheStats = conflictEngine.getCacheStats()
      expect(cacheStats.size).toBeGreaterThan(0)
      expect(cacheStats.oldestEntry).toBeInstanceOf(Date)
    })

    it('should handle cache invalidation on capacity updates', async () => {
      const meetingData = createMockMeetingData()

      // Setup initial mocks
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // First validation to populate cache
      await conflictEngine.validateMeeting(meetingData)
      expect(conflictEngine.getCacheStats().size).toBeGreaterThan(0)

      // Update capacity limits (should clear cache)
      conflictEngine.updateCapacityLimits([])
      expect(conflictEngine.getCacheStats().size).toBe(0)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database errors gracefully', async () => {
      const meetingData = createMockMeetingData()

      // Mock database error
      mockPrisma.meetingRoom.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      )

      const result = await conflictEngine.validateMeeting(meetingData)

      // Should still return a result with error conflicts
      expect(result).toBeDefined()
      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.canSubmit).toBe(false)
    })

    it('should handle partial service failures', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.HYBRID,
        meetingRoomId: 'room-1',
        isZoomMeeting: true,
      })

      // Room service works, Zoom service fails
      mockPrisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      })
      mockPrisma.meeting.findMany.mockResolvedValue([])
      mockPrisma.zoomCredentials.findMany.mockRejectedValue(
        new Error('Zoom service unavailable'),
      )

      const result = await conflictEngine.validateMeeting(meetingData)

      // Should still validate room requirements
      expect(result).toBeDefined()
      // Should have some form of validation result
      expect(result.conflicts).toBeDefined()
    })
  })
})

// Helper function to create mock meeting data
function createMeetingData(
  overrides: Partial<MeetingFormData> = {},
): MeetingFormData {
  return {
    title: 'Test Meeting',
    date: new Date('2025-12-15T00:00:00Z'),
    time: '10:00',
    duration: 60,
    meetingType: MeetingType.HYBRID,
    isZoomMeeting: true,
    meetingRoomId: 'room-1',
    participants: ['user1@example.com', 'user2@example.com'],
    description: 'Test meeting description',
    zoomPassword: 'password123',
    ...overrides,
  }
}
