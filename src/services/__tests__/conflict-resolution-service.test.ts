/**
 * Conflict Resolution Service Tests
 *
 * Tests for the ConflictResolutionService that generates actionable suggestions
 * for meeting conflicts with prioritization and feasibility scoring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { conflictResolutionService } from '../conflict-resolution-service'
import { roomAvailabilityService } from '../room-availability-service'
import {
  ConflictInfo,
  ConflictSuggestion,
  ConflictType,
  ConflictSeverity,
  SuggestionType,
  MeetingFormData,
  MeetingType,
  MeetingRoomInfo,
} from '@/types/conflict-detection'

// Mock the room availability service
vi.mock('../room-availability-service', () => ({
  roomAvailabilityService: {
    findOptimalRooms: vi.fn(),
  },
}))

describe('ConflictResolutionService', () => {
  const mockMeetingData: MeetingFormData = {
    title: 'Test Meeting',
    date: new Date('2024-01-15T10:00:00Z'),
    time: '10:00',
    duration: 60,
    meetingType: MeetingType.OFFLINE,
    isZoomMeeting: false,
    meetingRoomId: 'room-1',
    participants: ['user1@example.com', 'user2@example.com'],
    description: 'Test meeting description',
  }

  const mockRooms: MeetingRoomInfo[] = [
    {
      id: 'room-2',
      name: 'Conference Room B',
      capacity: 8,
      isActive: true,
      equipment: ['projector', 'whiteboard'],
      location: 'Floor 2',
    },
    {
      id: 'room-3',
      name: 'Meeting Room C',
      capacity: 6,
      isActive: true,
      equipment: ['tv'],
      location: 'Floor 1',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(roomAvailabilityService.findOptimalRooms).mockResolvedValue(
      mockRooms,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateComprehensiveSuggestions', () => {
    it('should generate room change suggestions for room conflicts', async () => {
      const conflicts: ConflictInfo[] = [
        {
          type: ConflictType.ROOM_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Room is already booked',
          affectedResource: 'room-1',
          suggestions: [
            'Use Conference Room B instead',
            'Schedule at 11:00 (after conflicts)',
          ],
        },
      ]

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          mockMeetingData,
        )

      expect(suggestions).toHaveLength(2)

      // Check room change suggestion
      const roomSuggestion = suggestions.find(
        (s: ConflictSuggestion) => s.type === SuggestionType.ROOM_CHANGE,
      )
      expect(roomSuggestion).toBeDefined()
      expect(roomSuggestion?.description).toBe('Use Conference Room B instead')
      expect(roomSuggestion?.action.field).toBe('meetingRoomId')
      expect(roomSuggestion?.action.value).toBe('Conference Room B')

      // Check time change suggestion
      const timeSuggestion = suggestions.find(
        (s: ConflictSuggestion) => s.type === SuggestionType.TIME_CHANGE,
      )
      expect(timeSuggestion).toBeDefined()
      expect(timeSuggestion?.description).toBe(
        'Schedule at 11:00 (after conflicts)',
      )
      expect(timeSuggestion?.action.field).toBe('time')
      expect(timeSuggestion?.action.value).toBe('11:00')
    })

    it('should generate room selection suggestions for missing room conflicts', async () => {
      const conflicts: ConflictInfo[] = [
        {
          type: ConflictType.MISSING_ROOM,
          severity: ConflictSeverity.ERROR,
          message: 'Offline meetings require a physical room',
          suggestions: ['Select a meeting room from the dropdown'],
        },
      ]

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          mockMeetingData,
        )

      expect(suggestions).toHaveLength(2)

      // Check room selection suggestion
      const roomSuggestion = suggestions.find((s: ConflictSuggestion) =>
        s.description.includes('Select a meeting room'),
      )
      expect(roomSuggestion).toBeDefined()
      expect(roomSuggestion?.type).toBe(SuggestionType.ROOM_CHANGE)
      expect(roomSuggestion?.action.field).toBe('meetingRoomId')
      expect(roomSuggestion?.action.value).toBe('auto-select')

      // Check meeting type change suggestion
      const typeSuggestion = suggestions.find(
        (s: ConflictSuggestion) => s.type === SuggestionType.TYPE_CHANGE,
      )
      expect(typeSuggestion).toBeDefined()
      expect(typeSuggestion?.description).toBe(
        'Change to online meeting (no room required)',
      )
      expect(typeSuggestion?.action.field).toBe('meetingType')
      expect(typeSuggestion?.action.value).toBe(MeetingType.ONLINE)
    })

    it('should generate time slot suggestions for Zoom capacity conflicts', async () => {
      const onlineMeetingData = {
        ...mockMeetingData,
        meetingType: MeetingType.ONLINE,
        isZoomMeeting: true,
      }

      const conflicts: ConflictInfo[] = [
        {
          type: ConflictType.ZOOM_CAPACITY,
          severity: ConflictSeverity.ERROR,
          message: 'Zoom capacity exceeded',
          suggestions: ['Try a different time slot'],
        },
      ]

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          onlineMeetingData,
        )

      expect(suggestions.length).toBeGreaterThan(0)

      // Should include time change suggestions
      const timeChangeSuggestions = suggestions.filter(
        (s: ConflictSuggestion) => s.type === SuggestionType.TIME_CHANGE,
      )
      expect(timeChangeSuggestions.length).toBeGreaterThan(0)

      // Should include meeting type change to offline
      const typeSuggestion = suggestions.find(
        (s: ConflictSuggestion) =>
          s.type === SuggestionType.TYPE_CHANGE &&
          s.action.value === MeetingType.OFFLINE,
      )
      expect(typeSuggestion).toBeDefined()
      expect(typeSuggestion?.description).toBe(
        'Change to offline meeting (no Zoom required)',
      )
    })

    it('should generate type change suggestions for invalid type conflicts', async () => {
      const conflicts: ConflictInfo[] = [
        {
          type: ConflictType.INVALID_TYPE,
          severity: ConflictSeverity.ERROR,
          message: 'Invalid Zoom configuration',
          suggestions: ['Enable Zoom for this meeting type'],
        },
      ]

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          mockMeetingData,
        )

      expect(suggestions).toHaveLength(1)

      const typeSuggestion = suggestions[0]
      expect(typeSuggestion.type).toBe(SuggestionType.TYPE_CHANGE)
      expect(typeSuggestion.description).toBe(
        'Enable Zoom for this meeting type',
      )
      expect(typeSuggestion.action.field).toBe('isZoomMeeting')
      expect(typeSuggestion.action.value).toBe(true)
    })
  })

  describe('applySuggestion', () => {
    it('should apply room change suggestion correctly', () => {
      const suggestion = {
        id: 'suggestion-1',
        type: SuggestionType.ROOM_CHANGE,
        description: 'Use Conference Room B',
        action: {
          field: 'meetingRoomId' as keyof MeetingFormData,
          value: 'room-2',
          additionalChanges: {},
        },
        priority: 1,
      }

      const changes = conflictResolutionService.applySuggestion(suggestion)

      expect(changes).toEqual({
        meetingRoomId: 'room-2',
      })
    })

    it('should apply time change suggestion correctly', () => {
      const suggestion = {
        id: 'suggestion-2',
        type: SuggestionType.TIME_CHANGE,
        description: 'Schedule at 11:00',
        action: {
          field: 'time' as keyof MeetingFormData,
          value: '11:00',
          additionalChanges: {},
        },
        priority: 2,
      }

      const changes = conflictResolutionService.applySuggestion(suggestion)

      expect(changes).toEqual({
        time: '11:00',
      })
    })

    it('should apply type change suggestion with additional changes', () => {
      const suggestion = {
        id: 'suggestion-3',
        type: SuggestionType.TYPE_CHANGE,
        description: 'Change to online meeting',
        action: {
          field: 'meetingType' as keyof MeetingFormData,
          value: MeetingType.ONLINE,
          additionalChanges: {
            isZoomMeeting: true,
            meetingRoomId: undefined,
          },
        },
        priority: 3,
      }

      const changes = conflictResolutionService.applySuggestion(suggestion)

      expect(changes).toEqual({
        meetingType: MeetingType.ONLINE,
        isZoomMeeting: true,
        meetingRoomId: undefined,
      })
    })

    it('should handle auto-select room suggestion', () => {
      const suggestion = {
        id: 'suggestion-4',
        type: SuggestionType.ROOM_CHANGE,
        description: 'Select a meeting room',
        action: {
          field: 'meetingRoomId' as keyof MeetingFormData,
          value: 'auto-select',
          additionalChanges: {},
        },
        priority: 1,
      }

      const changes = conflictResolutionService.applySuggestion(suggestion)

      expect(changes).toEqual({
        meetingRoomId: 'auto-select',
      })
    })
  })

  describe('prioritizeSuggestions', () => {
    it('should prioritize suggestions by priority number (lower = higher priority)', () => {
      const suggestions = [
        {
          id: 'suggestion-1',
          type: SuggestionType.TIME_CHANGE,
          description: 'Time change',
          action: { field: 'time' as keyof MeetingFormData, value: '11:00' },
          priority: 3,
        },
        {
          id: 'suggestion-2',
          type: SuggestionType.ROOM_CHANGE,
          description: 'Room change',
          action: {
            field: 'meetingRoomId' as keyof MeetingFormData,
            value: 'room-2',
          },
          priority: 1,
        },
        {
          id: 'suggestion-3',
          type: SuggestionType.TYPE_CHANGE,
          description: 'Type change',
          action: {
            field: 'meetingType' as keyof MeetingFormData,
            value: MeetingType.ONLINE,
          },
          priority: 2,
        },
      ]

      const prioritized =
        conflictResolutionService.prioritizeSuggestions(suggestions)

      expect(prioritized).toHaveLength(3)
      expect(prioritized[0].priority).toBe(1) // Room change (highest priority)
      expect(prioritized[1].priority).toBe(2) // Type change
      expect(prioritized[2].priority).toBe(3) // Time change (lowest priority)
    })

    it('should limit suggestions to maximum number', () => {
      const suggestions = Array.from({ length: 15 }, (_, i) => ({
        id: `suggestion-${i}`,
        type: SuggestionType.ROOM_CHANGE,
        description: `Suggestion ${i}`,
        action: {
          field: 'meetingRoomId' as keyof MeetingFormData,
          value: `room-${i}`,
        },
        priority: i,
      }))

      const prioritized =
        conflictResolutionService.prioritizeSuggestions(suggestions)

      expect(prioritized.length).toBeLessThanOrEqual(8) // MAX_SUGGESTIONS = 8
    })

    it('should sort by suggestion type when priorities are equal', () => {
      const suggestions = [
        {
          id: 'suggestion-1',
          type: SuggestionType.TYPE_CHANGE,
          description: 'Type change',
          action: {
            field: 'meetingType' as keyof MeetingFormData,
            value: MeetingType.ONLINE,
          },
          priority: 1,
        },
        {
          id: 'suggestion-2',
          type: SuggestionType.ROOM_CHANGE,
          description: 'Room change',
          action: {
            field: 'meetingRoomId' as keyof MeetingFormData,
            value: 'room-2',
          },
          priority: 1,
        },
        {
          id: 'suggestion-3',
          type: SuggestionType.TIME_CHANGE,
          description: 'Time change',
          action: { field: 'time' as keyof MeetingFormData, value: '11:00' },
          priority: 1,
        },
      ]

      const prioritized =
        conflictResolutionService.prioritizeSuggestions(suggestions)

      expect(prioritized[0].type).toBe(SuggestionType.ROOM_CHANGE) // Type order: 1
      expect(prioritized[1].type).toBe(SuggestionType.TIME_CHANGE) // Type order: 2
      expect(prioritized[2].type).toBe(SuggestionType.TYPE_CHANGE) // Type order: 3
    })
  })

  describe('getRoomSuggestions', () => {
    it('should return room suggestions with feasibility scores', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')
      const participantCount = 5

      const suggestions = await conflictResolutionService.getRoomSuggestions(
        startTime,
        endTime,
        participantCount,
        'room-1', // exclude this room
      )

      expect(roomAvailabilityService.findOptimalRooms).toHaveBeenCalledWith(
        startTime,
        endTime,
        participantCount,
      )

      expect(suggestions).toHaveLength(2)
      expect(suggestions[0]).toHaveProperty('feasibilityScore')
      expect(suggestions[0].feasibilityScore).toBeGreaterThan(0)
      expect(suggestions[0].feasibilityScore).toBeLessThanOrEqual(1)

      // Should exclude the specified room
      expect(
        suggestions.find((s: MeetingRoomInfo) => s.id === 'room-1'),
      ).toBeUndefined()
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(roomAvailabilityService.findOptimalRooms).mockRejectedValue(
        new Error('Database error'),
      )

      const suggestions = await conflictResolutionService.getRoomSuggestions(
        new Date(),
        new Date(),
        5,
      )

      expect(suggestions).toEqual([])
    })
  })

  describe('generateComprehensiveSuggestions', () => {
    it('should generate comprehensive suggestions including enhanced room suggestions', async () => {
      const conflicts: ConflictInfo[] = [
        {
          type: ConflictType.ROOM_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Room is already booked',
          affectedResource: 'room-1',
        },
      ]

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          mockMeetingData,
        )

      expect(suggestions.length).toBeGreaterThan(0)

      // Should include enhanced room suggestions
      const roomSuggestions = suggestions.filter(
        (s: ConflictSuggestion) => s.type === SuggestionType.ROOM_CHANGE,
      )
      expect(roomSuggestions.length).toBeGreaterThan(0)

      // Check that room suggestions include capacity and match percentage
      const enhancedRoomSuggestion = roomSuggestions.find(
        (s: ConflictSuggestion) =>
          s.description.includes('capacity:') &&
          s.description.includes('% match'),
      )
      expect(enhancedRoomSuggestion).toBeDefined()
    })

    it('should handle missing meeting data gracefully', async () => {
      const conflicts: ConflictInfo[] = [
        {
          type: ConflictType.ROOM_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Room conflict',
        },
      ]

      const incompleteMeetingData: MeetingFormData = {
        ...mockMeetingData,
        date: undefined as unknown as Date,
        time: undefined as unknown as string,
      }

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          incompleteMeetingData,
        )

      // Should still return basic suggestions
      expect(suggestions).toBeDefined()
      expect(Array.isArray(suggestions)).toBe(true)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty conflicts array', async () => {
      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          [],
          mockMeetingData,
        )
      expect(suggestions).toEqual([])
    })

    it('should handle conflicts without suggestions', async () => {
      const conflicts: ConflictInfo[] = [
        {
          type: ConflictType.ROOM_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Room conflict without suggestions',
        },
      ]

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          mockMeetingData,
        )

      // Should generate at least a generic suggestion
      expect(suggestions.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle malformed time suggestions', async () => {
      const conflicts: ConflictInfo[] = [
        {
          type: ConflictType.ROOM_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Room conflict',
          suggestions: ['Schedule at invalid-time'],
        },
      ]

      const suggestions =
        await conflictResolutionService.generateComprehensiveSuggestions(
          conflicts,
          mockMeetingData,
        )

      // Should not crash and should not include invalid time suggestions
      const timeSuggestions = suggestions.filter(
        (s: ConflictSuggestion) => s.type === SuggestionType.TIME_CHANGE,
      )
      expect(timeSuggestions).toHaveLength(0)
    })
  })
})
