/**
 * Meeting Type Validator Tests
 * 
 * Comprehensive tests for meeting type validation rules including
 * offline, hybrid, and online meeting validation scenarios.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { meetingTypeValidator } from '../meeting-type-validator'
import { zoomAccountService } from '../zoom-account-service'
import { 
  MeetingFormData, 
  MeetingType, 
  ConflictType, 
  ConflictSeverity 
} from '@/types/conflict-detection'

// Mock the zoom account service
vi.mock('../zoom-account-service', () => ({
  zoomAccountService: {
    getAvailableAccounts: vi.fn()
  }
}))

describe('MeetingTypeValidator', () => {
  let mockMeetingData: MeetingFormData

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup default mock meeting data
    mockMeetingData = {
      title: 'Test Meeting',
      date: new Date('2025-12-01T10:00:00Z'),
      time: '14:30',
      duration: 60,
      meetingType: MeetingType.OFFLINE,
      isZoomMeeting: false,
      meetingRoomId: 'room-1',
      participants: ['user1@example.com', 'user2@example.com'],
      description: 'Test meeting description'
    }

    // Mock Zoom accounts as available by default
    vi.mocked(zoomAccountService.getAvailableAccounts).mockResolvedValue([
      {
        id: 'zoom-1',
        email: 'zoom1@example.com',
        isActive: true,
        maxConcurrentMeetings: 2,
        maxParticipants: 1000,
        currentActiveMeetings: 0,
        scheduledMeetings: []
      }
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateOfflineMeeting', () => {
    beforeEach(() => {
      mockMeetingData.meetingType = MeetingType.OFFLINE
    })

    it('should pass validation for valid offline meeting', () => {
      mockMeetingData.isZoomMeeting = false
      mockMeetingData.meetingRoomId = 'room-1'

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(true)
      expect(result.conflicts).toHaveLength(0)
      expect(result.requiredFields).toEqual([])
    })

    it('should require physical room for offline meeting', () => {
      mockMeetingData.meetingRoomId = undefined

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toMatchObject({
        type: ConflictType.MISSING_ROOM,
        severity: ConflictSeverity.ERROR,
        message: 'Offline meetings require a physical meeting room to be selected.'
      })
      expect(result.requiredFields).toContain('meetingRoomId')
    })

    it('should warn when Zoom is enabled for offline meeting', () => {
      mockMeetingData.isZoomMeeting = true
      mockMeetingData.meetingRoomId = 'room-1'

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(true) // Warning doesn't block submission
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toMatchObject({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message: 'Offline meetings typically don\'t need Zoom meetings enabled.'
      })
    })

    it('should validate basic meeting data for offline meeting', () => {
      mockMeetingData.title = ''
      mockMeetingData.meetingRoomId = 'room-1'

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.message === 'Meeting title is required.')).toBe(true)
      expect(result.requiredFields).toContain('title')
    })
  })

  describe('validateHybridMeeting', () => {
    beforeEach(() => {
      mockMeetingData.meetingType = MeetingType.HYBRID
    })

    it('should pass validation for valid hybrid meeting', () => {
      mockMeetingData.isZoomMeeting = true
      mockMeetingData.meetingRoomId = 'room-1'

      const result = meetingTypeValidator.validateHybridMeeting(mockMeetingData)

      expect(result.isValid).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should warn when room is missing for hybrid meeting', () => {
      mockMeetingData.meetingRoomId = undefined
      mockMeetingData.isZoomMeeting = true

      const result = meetingTypeValidator.validateHybridMeeting(mockMeetingData)

      expect(result.isValid).toBe(true) // Warning doesn't block submission
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toMatchObject({
        type: ConflictType.MISSING_ROOM,
        severity: ConflictSeverity.WARNING,
        message: 'Hybrid meetings typically require a physical room for in-person participants.'
      })
      expect(result.requiredFields).toContain('meetingRoomId')
    })

    it('should warn when Zoom is disabled for hybrid meeting', () => {
      mockMeetingData.isZoomMeeting = false
      mockMeetingData.meetingRoomId = 'room-1'

      const result = meetingTypeValidator.validateHybridMeeting(mockMeetingData)

      expect(result.isValid).toBe(true) // Warning doesn't block submission
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toMatchObject({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message: 'Hybrid meetings typically need Zoom enabled for remote participants.'
      })
      expect(result.requiredFields).toContain('isZoomMeeting')
    })

    it('should warn for both missing room and disabled Zoom', () => {
      mockMeetingData.meetingRoomId = undefined
      mockMeetingData.isZoomMeeting = false

      const result = meetingTypeValidator.validateHybridMeeting(mockMeetingData)

      expect(result.isValid).toBe(true) // Warnings don't block submission
      expect(result.conflicts).toHaveLength(2)
      expect(result.conflicts.some(c => c.type === ConflictType.MISSING_ROOM)).toBe(true)
      expect(result.conflicts.some(c => c.type === ConflictType.INVALID_TYPE)).toBe(true)
    })
  })

  describe('validateOnlineMeeting', () => {
    beforeEach(() => {
      mockMeetingData.meetingType = MeetingType.ONLINE
    })

    it('should pass validation for valid online meeting', () => {
      mockMeetingData.isZoomMeeting = true
      mockMeetingData.meetingRoomId = undefined

      const result = meetingTypeValidator.validateOnlineMeeting(mockMeetingData)

      expect(result.isValid).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should require Zoom for online meeting', () => {
      mockMeetingData.isZoomMeeting = false

      const result = meetingTypeValidator.validateOnlineMeeting(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts.length).toBeGreaterThanOrEqual(1)
      expect(result.conflicts.some(c => 
        c.type === ConflictType.INVALID_TYPE &&
        c.severity === ConflictSeverity.ERROR &&
        c.message === 'Online meetings require Zoom to be enabled.'
      )).toBe(true)
      expect(result.requiredFields).toContain('isZoomMeeting')
    })

    it('should warn when room is selected for online meeting', () => {
      mockMeetingData.isZoomMeeting = true
      mockMeetingData.meetingRoomId = 'room-1'

      const result = meetingTypeValidator.validateOnlineMeeting(mockMeetingData)

      expect(result.isValid).toBe(true) // Warning doesn't block submission
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toMatchObject({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message: 'Online meetings typically don\'t need a physical room.'
      })
    })
  })

  describe('validateMeetingType', () => {
    it('should route to correct validator based on meeting type', () => {
      // Test offline routing
      mockMeetingData.meetingType = MeetingType.OFFLINE
      mockMeetingData.meetingRoomId = undefined
      
      let result = meetingTypeValidator.validateMeetingType(mockMeetingData)
      expect(result.conflicts.some(c => c.type === ConflictType.MISSING_ROOM)).toBe(true)

      // Test online routing
      mockMeetingData.meetingType = MeetingType.ONLINE
      mockMeetingData.isZoomMeeting = false
      
      result = meetingTypeValidator.validateMeetingType(mockMeetingData)
      expect(result.conflicts.some(c => c.message.includes('Zoom to be enabled'))).toBe(true)
    })

    it('should handle invalid meeting type', () => {
      mockMeetingData.meetingType = 'invalid' as MeetingType

      const result = meetingTypeValidator.validateMeetingType(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts[0]).toMatchObject({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.ERROR,
        message: 'Invalid meeting type: invalid'
      })
    })
  })

  describe('Basic Meeting Data Validation', () => {
    it('should validate required title', () => {
      mockMeetingData.title = ''

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.message === 'Meeting title is required.')).toBe(true)
      expect(result.requiredFields).toContain('title')
    })

    it('should validate required date', () => {
      mockMeetingData.date = null as any

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.message === 'Meeting date is required.')).toBe(true)
      expect(result.requiredFields).toContain('date')
    })

    it('should validate time format', () => {
      mockMeetingData.time = 'invalid-time'

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.message.includes('Valid meeting time is required'))).toBe(true)
      expect(result.requiredFields).toContain('time')
    })

    it('should accept valid time formats', () => {
      const validTimes = ['09:00', '14:30', '23:59', '00:00']
      
      validTimes.forEach(time => {
        mockMeetingData.time = time
        const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)
        expect(result.conflicts.some(c => c.message.includes('Valid meeting time is required'))).toBe(false)
      })
    })

    it('should validate duration', () => {
      mockMeetingData.duration = 0

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.message.includes('duration must be greater than 0'))).toBe(true)
      expect(result.requiredFields).toContain('duration')
    })

    it('should warn about unusually long duration', () => {
      mockMeetingData.duration = 500 // More than 8 hours

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(true) // Warning doesn't block
      expect(result.conflicts.some(c => 
        c.severity === ConflictSeverity.WARNING && 
        c.message.includes('unusually long')
      )).toBe(true)
    })

    it('should prevent scheduling in the past', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      mockMeetingData.date = pastDate
      mockMeetingData.time = '10:00'

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(false)
      expect(result.conflicts.some(c => c.message.includes('cannot be scheduled in the past'))).toBe(true)
    })

    it('should warn about missing participants', () => {
      mockMeetingData.participants = []

      const result = meetingTypeValidator.validateOfflineMeeting(mockMeetingData)

      expect(result.isValid).toBe(true) // Warning doesn't block
      expect(result.conflicts.some(c => 
        c.severity === ConflictSeverity.WARNING && 
        c.message.includes('No participants specified')
      )).toBe(true)
    })
  })

  describe('Zoom Password Validation', () => {
    beforeEach(() => {
      mockMeetingData.meetingType = MeetingType.ONLINE
      mockMeetingData.isZoomMeeting = true
    })

    it('should warn about short Zoom password', () => {
      mockMeetingData.zoomPassword = '123'

      const result = meetingTypeValidator.validateOnlineMeeting(mockMeetingData)

      expect(result.isValid).toBe(true) // Warning doesn't block
      expect(result.conflicts.some(c => 
        c.severity === ConflictSeverity.WARNING && 
        c.message.includes('at least 4 characters long')
      )).toBe(true)
    })

    it('should accept valid Zoom password', () => {
      mockMeetingData.zoomPassword = 'secure123'

      const result = meetingTypeValidator.validateOnlineMeeting(mockMeetingData)

      expect(result.conflicts.some(c => c.message.includes('password'))).toBe(false)
    })
  })

  describe('Utility Methods', () => {
    it('should return validation rules for each meeting type', () => {
      const offlineRules = meetingTypeValidator.getValidationRulesForType(MeetingType.OFFLINE)
      expect(offlineRules).toContain('Physical meeting room is required')

      const hybridRules = meetingTypeValidator.getValidationRulesForType(MeetingType.HYBRID)
      expect(hybridRules.some(rule => rule.includes('room is recommended'))).toBe(true)

      const onlineRules = meetingTypeValidator.getValidationRulesForType(MeetingType.ONLINE)
      expect(onlineRules).toContain('Zoom meeting is required')
    })

    it('should return required fields for each meeting type', () => {
      const offlineFields = meetingTypeValidator.getRequiredFieldsForType(MeetingType.OFFLINE)
      expect(offlineFields).toContain('meetingRoomId')

      const onlineFields = meetingTypeValidator.getRequiredFieldsForType(MeetingType.ONLINE)
      expect(onlineFields).toContain('isZoomMeeting')

      const hybridFields = meetingTypeValidator.getRequiredFieldsForType(MeetingType.HYBRID)
      expect(hybridFields).toContain('title')
    })

    it('should validate meeting type changes', () => {
      mockMeetingData.meetingType = MeetingType.OFFLINE
      mockMeetingData.meetingRoomId = 'room-1'

      const result = meetingTypeValidator.validateMeetingTypeChange(
        mockMeetingData, 
        MeetingType.ONLINE
      )

      expect(result.conflicts[0].message).toContain('Meeting type changed from offline to online')
      expect(result.conflicts.some(c => c.message.includes('Zoom to be enabled'))).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      // Mock an error in the validation process by passing completely invalid data
      const invalidData = { ...mockMeetingData }
      // @ts-ignore - Intentionally pass invalid data to test error handling
      invalidData.date = 'invalid-date' as any
      // @ts-ignore - Intentionally pass invalid data to test error handling
      invalidData.time = null as any

      const result = meetingTypeValidator.validateMeetingType(invalidData)

      // The validator should still return a result, but with validation errors
      expect(result.isValid).toBe(false)
      expect(result.conflicts.length).toBeGreaterThan(0)
      // Should have validation errors for invalid date/time
      expect(result.conflicts.some(c => 
        c.message.includes('Meeting date is required') || 
        c.message.includes('Valid meeting time is required')
      )).toBe(true)
    })
  })
})