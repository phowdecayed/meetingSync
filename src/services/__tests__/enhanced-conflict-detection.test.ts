/**
 * Enhanced Conflict Detection Engine Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EnhancedConflictDetectionEngine } from '../enhanced-conflict-detection'
import { 
  MeetingType, 
  ConflictType, 
  ConflictSeverity,
  MeetingFormData 
} from '@/types/conflict-detection'

// Mock room availability service using vi.hoisted
const mockRoomAvailabilityService = vi.hoisted(() => ({
  generateRoomConflictInfo: vi.fn(),
  findOptimalRooms: vi.fn(),
}))

vi.mock('../room-availability-service', () => ({
  roomAvailabilityService: mockRoomAvailabilityService,
}))

describe('EnhancedConflictDetectionEngine', () => {
  let engine: EnhancedConflictDetectionEngine

  beforeEach(() => {
    engine = new EnhancedConflictDetectionEngine()
    vi.clearAllMocks()
  })

  afterEach(() => {
    engine.unsubscribe()
    vi.resetAllMocks()
  })

  const createMockMeetingData = (overrides: Partial<MeetingFormData> = {}): MeetingFormData => ({
    title: 'Test Meeting',
    date: new Date('2025-12-15T00:00:00Z'), // Use future date
    time: '10:00',
    duration: 60,
    meetingType: MeetingType.HYBRID,
    isZoomMeeting: true,
    meetingRoomId: 'room-1',
    participants: ['user1@example.com', 'user2@example.com'],
    description: 'Test meeting description',
    zoomPassword: 'password123',
    ...overrides,
  })

  describe('validateMeeting', () => {
    it('should validate offline meeting requirements', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.OFFLINE,
        meetingRoomId: undefined,
        isZoomMeeting: true,
      })

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)
      mockRoomAvailabilityService.findOptimalRooms.mockResolvedValue([])

      const result = await engine.validateMeeting(meetingData)

      expect(result.conflicts.length).toBeGreaterThanOrEqual(2)
      
      // Should have missing room error
      const missingRoomConflict = result.conflicts.find(c => c.type === ConflictType.MISSING_ROOM)
      expect(missingRoomConflict).toBeDefined()
      expect(missingRoomConflict?.severity).toBe(ConflictSeverity.ERROR)
      
      // Should have warning about Zoom for offline meeting
      const invalidTypeConflict = result.conflicts.find(c => 
        c.type === ConflictType.INVALID_TYPE && c.message.includes('Zoom')
      )
      expect(invalidTypeConflict).toBeDefined()
      expect(invalidTypeConflict?.severity).toBe(ConflictSeverity.WARNING)
      
      expect(result.canSubmit).toBe(false) // Has error-level conflicts
    })

    it('should validate hybrid meeting requirements', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.HYBRID,
        meetingRoomId: undefined,
        isZoomMeeting: false,
      })

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)
      mockRoomAvailabilityService.findOptimalRooms.mockResolvedValue([])

      const result = await engine.validateMeeting(meetingData)

      expect(result.conflicts.length).toBeGreaterThanOrEqual(2)
      
      // Should have warnings for both missing room and missing Zoom
      const missingRoomConflict = result.conflicts.find(c => c.type === ConflictType.MISSING_ROOM)
      expect(missingRoomConflict).toBeDefined()
      expect(missingRoomConflict?.severity).toBe(ConflictSeverity.WARNING)
      
      const missingZoomConflict = result.conflicts.find(c => 
        c.type === ConflictType.INVALID_TYPE && c.message.includes('Zoom')
      )
      expect(missingZoomConflict).toBeDefined()
      expect(missingZoomConflict?.severity).toBe(ConflictSeverity.WARNING)
      
      // Check that there are no ERROR level conflicts
      const errorConflicts = result.conflicts.filter(c => c.severity === ConflictSeverity.ERROR)
      expect(errorConflicts).toHaveLength(0)
      
      expect(result.canSubmit).toBe(true) // Only warnings, no errors
    })

    it('should validate online meeting requirements', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.ONLINE,
        meetingRoomId: 'room-1',
        isZoomMeeting: false,
      })

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)

      const result = await engine.validateMeeting(meetingData)

      expect(result.conflicts.length).toBeGreaterThanOrEqual(2)
      
      // Should have error for missing Zoom
      const missingZoomConflict = result.conflicts.find(c => 
        c.type === ConflictType.INVALID_TYPE && c.message.includes('Zoom to be enabled')
      )
      expect(missingZoomConflict).toBeDefined()
      expect(missingZoomConflict?.severity).toBe(ConflictSeverity.ERROR)
      
      // Should have warning about room for online meeting
      const unnecessaryRoomConflict = result.conflicts.find(c => 
        c.type === ConflictType.INVALID_TYPE && c.message.includes('room')
      )
      expect(unnecessaryRoomConflict).toBeDefined()
      expect(unnecessaryRoomConflict?.severity).toBe(ConflictSeverity.WARNING)
      
      expect(result.canSubmit).toBe(false) // Has error-level conflicts
    })

    it('should validate room conflicts', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.HYBRID,
        meetingRoomId: 'room-1',
        isZoomMeeting: true,
      })

      const roomConflict = {
        type: ConflictType.ROOM_CONFLICT,
        severity: ConflictSeverity.ERROR,
        message: 'Room is already booked',
        affectedResource: 'room-1',
        suggestions: ['Use Room B instead', 'Schedule at 14:00 (after conflicts)'],
      }

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(roomConflict)

      const result = await engine.validateMeeting(meetingData)

      expect(result.conflicts).toContain(roomConflict)
      expect(result.canSubmit).toBe(false)
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should generate suggestions for conflicts', async () => {
      const meetingData = createMockMeetingData({
        meetingType: MeetingType.OFFLINE,
        meetingRoomId: undefined,
      })

      const mockOptimalRooms = [
        { id: 'room-2', name: 'Conference Room B', capacity: 8, isActive: true, equipment: [] },
        { id: 'room-3', name: 'Conference Room C', capacity: 10, isActive: true, equipment: [] },
      ]

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)
      mockRoomAvailabilityService.findOptimalRooms.mockResolvedValue(mockOptimalRooms)

      const result = await engine.validateMeeting(meetingData)

      expect(result.suggestions.length).toBeGreaterThan(0)
      
      // Should have room suggestions
      const roomSuggestions = result.suggestions.filter(s => s.type === 'room_change')
      expect(roomSuggestions.length).toBeGreaterThan(0)
    })

    it('should use cache for repeated validations', async () => {
      const meetingData = createMockMeetingData()

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)

      // First call
      await engine.validateMeeting(meetingData)
      
      // Second call should use cache
      await engine.validateMeeting(meetingData)

      // Room service should only be called once due to caching
      expect(mockRoomAvailabilityService.generateRoomConflictInfo).toHaveBeenCalledTimes(1)
    })

    it('should handle validation errors gracefully', async () => {
      const meetingData = createMockMeetingData()

      mockRoomAvailabilityService.generateRoomConflictInfo.mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await engine.validateMeeting(meetingData)

      expect(result.conflicts.length).toBeGreaterThanOrEqual(1)
      
      // Should have room conflict error from the database failure
      const roomConflictError = result.conflicts.find(c => c.type === ConflictType.ROOM_CONFLICT)
      expect(roomConflictError).toBeDefined()
      expect(roomConflictError?.severity).toBe(ConflictSeverity.ERROR)
      
      expect(result.canSubmit).toBe(false)
    })
  })

  describe('subscribeToChanges', () => {
    it('should notify subscribers of conflict events', async () => {
      const callback = vi.fn()
      engine.subscribeToChanges(callback)

      const meetingData = createMockMeetingData({
        meetingType: MeetingType.OFFLINE,
        meetingRoomId: undefined,
      })

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)
      mockRoomAvailabilityService.findOptimalRooms.mockResolvedValue([])

      await engine.validateMeeting(meetingData)

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('cache management', () => {
    it('should clear cache when requested', async () => {
      const meetingData = createMockMeetingData()

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)

      // First call
      await engine.validateMeeting(meetingData)
      
      // Clear cache
      engine.clearCache()
      
      // Second call should not use cache
      await engine.validateMeeting(meetingData)

      expect(mockRoomAvailabilityService.generateRoomConflictInfo).toHaveBeenCalledTimes(2)
    })

    it('should provide cache statistics', async () => {
      const meetingData = createMockMeetingData()

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)

      const initialStats = engine.getCacheStats()
      expect(initialStats.size).toBe(0)
      expect(initialStats.oldestEntry).toBeNull()

      await engine.validateMeeting(meetingData)

      const afterValidationStats = engine.getCacheStats()
      expect(afterValidationStats.size).toBe(1)
      expect(afterValidationStats.oldestEntry).toBeInstanceOf(Date)
    })
  })

  describe('updateCapacityLimits', () => {
    it('should clear cache when capacity limits are updated', async () => {
      const meetingData = createMockMeetingData()

      mockRoomAvailabilityService.generateRoomConflictInfo.mockResolvedValue(null)

      // First call to populate cache
      await engine.validateMeeting(meetingData)
      
      expect(engine.getCacheStats().size).toBe(1)
      
      // Update capacity limits
      engine.updateCapacityLimits([])
      
      expect(engine.getCacheStats().size).toBe(0)
    })
  })
})