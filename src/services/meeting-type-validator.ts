/**
 * Meeting Type Validator Service
 *
 * Implements type-specific validation rules for offline, hybrid, and online meetings.
 * Validates meeting requirements based on meeting type constraints.
 */

import {
  MeetingTypeValidator,
  ValidationResult,
  MeetingFormData,
  MeetingType,
  ConflictInfo,
  ConflictType,
  ConflictSeverity,
  ConflictDetectionError,
} from '@/types/conflict-detection'
import { zoomAccountServiceClient } from './zoom-account-service-client'

export class MeetingTypeValidatorImpl implements MeetingTypeValidator {
  private static instance: MeetingTypeValidatorImpl

  private constructor() {}

  public static getInstance(): MeetingTypeValidatorImpl {
    if (!MeetingTypeValidatorImpl.instance) {
      MeetingTypeValidatorImpl.instance = new MeetingTypeValidatorImpl()
    }
    return MeetingTypeValidatorImpl.instance
  }

  /**
   * Main validation method that routes to type-specific validators
   */
  validateMeetingType(data: MeetingFormData): ValidationResult {
    try {
      switch (data.meetingType) {
        case MeetingType.OFFLINE:
          return this.validateOfflineMeeting(data)
        case MeetingType.HYBRID:
          return this.validateHybridMeeting(data)
        case MeetingType.ONLINE:
          return this.validateOnlineMeeting(data)
        default:
          return {
            isValid: false,
            conflicts: [
              {
                type: ConflictType.INVALID_TYPE,
                severity: ConflictSeverity.ERROR,
                message: `Invalid meeting type: ${data.meetingType}`,
                suggestions: [
                  'Select a valid meeting type (offline, hybrid, or online)',
                ],
              },
            ],
            requiredFields: ['meetingType'],
          }
      }
    } catch (error) {
      console.error('Error validating meeting type:', error)
      return {
        isValid: false,
        conflicts: [
          {
            type: ConflictType.INVALID_TYPE,
            severity: ConflictSeverity.ERROR,
            message: 'Unable to validate meeting type. Please try again.',
          },
        ],
        requiredFields: [],
      }
    }
  }

  /**
   * Validate offline meeting requirements
   * Requirements: 3.1 - WHEN scheduling an offline meeting THEN the system SHALL require a physical room selection
   */
  validateOfflineMeeting(data: MeetingFormData): ValidationResult {
    const conflicts: ConflictInfo[] = []
    const requiredFields: string[] = []

    // Rule 1: Offline meetings must have a physical room
    if (!data.meetingRoomId) {
      conflicts.push({
        type: ConflictType.MISSING_ROOM,
        severity: ConflictSeverity.ERROR,
        message:
          'Offline meetings require a physical meeting room to be selected.',
        suggestions: [
          'Select a meeting room from the available options',
          'Consider changing to online meeting if no room is needed',
        ],
      })
      requiredFields.push('meetingRoomId')
    }

    // Rule 2: Offline meetings typically shouldn't have Zoom enabled (warning only)
    if (data.isZoomMeeting) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message: "Offline meetings typically don't need Zoom meetings enabled.",
        suggestions: [
          'Disable Zoom meeting for offline meetings',
          'Consider changing to hybrid meeting if remote participants are expected',
        ],
      })
    }

    // Rule 3: Validate basic meeting data
    const basicValidation = this.validateBasicMeetingData(data)
    conflicts.push(...basicValidation.conflicts)
    requiredFields.push(...basicValidation.requiredFields)

    return {
      isValid:
        conflicts.filter((c) => c.severity === ConflictSeverity.ERROR)
          .length === 0,
      conflicts,
      requiredFields: [...new Set(requiredFields)], // Remove duplicates
    }
  }

  /**
   * Validate hybrid meeting requirements
   * Requirements: 3.2 - WHEN scheduling a hybrid meeting THEN the system SHALL require both a physical room and validate Zoom capacity
   */
  validateHybridMeeting(data: MeetingFormData): ValidationResult {
    const conflicts: ConflictInfo[] = []
    const requiredFields: string[] = []

    // Rule 1: Hybrid meetings should have a physical room for in-person participants
    if (!data.meetingRoomId) {
      conflicts.push({
        type: ConflictType.MISSING_ROOM,
        severity: ConflictSeverity.WARNING,
        message:
          'Hybrid meetings typically require a physical room for in-person participants.',
        suggestions: [
          'Select a meeting room for in-person participants',
          'Consider changing to online meeting if all participants will be remote',
        ],
      })
      requiredFields.push('meetingRoomId')
    }

    // Rule 2: Hybrid meetings should have Zoom enabled for remote participants
    if (!data.isZoomMeeting) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message:
          'Hybrid meetings typically need Zoom enabled for remote participants.',
        suggestions: [
          'Enable Zoom meeting for remote participants',
          'Consider changing to offline meeting if all participants will be in-person',
        ],
      })
      requiredFields.push('isZoomMeeting')
    }

    // Rule 3: If Zoom is enabled, validate that we have capacity (this will be checked by conflict detection engine)
    if (data.isZoomMeeting) {
      // Note: Actual Zoom capacity validation is handled by the conflict detection engine
      // This is just a placeholder to indicate the requirement
      const zoomValidation = this.validateZoomRequirement(data)
      conflicts.push(...zoomValidation.conflicts)
      requiredFields.push(...zoomValidation.requiredFields)
    }

    // Rule 4: Validate basic meeting data
    const basicValidation = this.validateBasicMeetingData(data)
    conflicts.push(...basicValidation.conflicts)
    requiredFields.push(...basicValidation.requiredFields)

    return {
      isValid:
        conflicts.filter((c) => c.severity === ConflictSeverity.ERROR)
          .length === 0,
      conflicts,
      requiredFields: [...new Set(requiredFields)], // Remove duplicates
    }
  }

  /**
   * Validate online meeting requirements
   * Requirements: 3.3 - WHEN scheduling an online meeting THEN the system SHALL only validate Zoom capacity constraints
   */
  validateOnlineMeeting(data: MeetingFormData): ValidationResult {
    const conflicts: ConflictInfo[] = []
    const requiredFields: string[] = []

    // Rule 1: Online meetings must have Zoom enabled
    if (!data.isZoomMeeting) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.ERROR,
        message: 'Online meetings require Zoom to be enabled.',
        suggestions: [
          'Enable Zoom meeting for online meetings',
          'Consider changing to offline meeting if meeting will be in-person only',
        ],
      })
      requiredFields.push('isZoomMeeting')
    }

    // Rule 2: Room selection for online meetings is unusual (warning only)
    if (data.meetingRoomId) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message: "Online meetings typically don't need a physical room.",
        suggestions: [
          'Remove room selection for online meetings',
          'Consider changing to hybrid meeting if some participants will be in-person',
        ],
      })
    }

    // Rule 3: Validate Zoom capacity requirements
    if (data.isZoomMeeting) {
      const zoomValidation = this.validateZoomRequirement(data)
      conflicts.push(...zoomValidation.conflicts)
      requiredFields.push(...zoomValidation.requiredFields)
    }

    // Rule 4: Validate basic meeting data
    const basicValidation = this.validateBasicMeetingData(data)
    conflicts.push(...basicValidation.conflicts)
    requiredFields.push(...basicValidation.requiredFields)

    return {
      isValid:
        conflicts.filter((c) => c.severity === ConflictSeverity.ERROR)
          .length === 0,
      conflicts,
      requiredFields: [...new Set(requiredFields)], // Remove duplicates
    }
  }

  /**
   * Validate basic meeting data that applies to all meeting types
   */
  private validateBasicMeetingData(data: MeetingFormData): ValidationResult {
    const conflicts: ConflictInfo[] = []
    const requiredFields: string[] = []

    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.ERROR,
        message: 'Meeting title is required.',
        suggestions: ['Enter a descriptive title for the meeting'],
      })
      requiredFields.push('title')
    }

    if (!data.date) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.ERROR,
        message: 'Meeting date is required.',
        suggestions: ['Select a date for the meeting'],
      })
      requiredFields.push('date')
    }

    if (!data.time || !this.isValidTimeFormat(data.time)) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.ERROR,
        message: 'Valid meeting time is required (HH:MM format).',
        suggestions: ['Enter a valid time in HH:MM format (e.g., 14:30)'],
      })
      requiredFields.push('time')
    }

    if (!data.duration || data.duration <= 0) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.ERROR,
        message: 'Meeting duration must be greater than 0 minutes.',
        suggestions: [
          'Enter a valid duration in minutes (e.g., 60 for 1 hour)',
        ],
      })
      requiredFields.push('duration')
    }

    // Validate duration is reasonable (not more than 8 hours)
    if (data.duration && data.duration > 480) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message: 'Meeting duration is unusually long (more than 8 hours).',
        suggestions: ['Consider breaking long meetings into multiple sessions'],
      })
    }

    // Validate date is not in the past
    if (data.date && data.time) {
      const meetingDateTime = this.createDateTime(data.date, data.time)
      const now = new Date()

      if (meetingDateTime < now) {
        conflicts.push({
          type: ConflictType.INVALID_TYPE,
          severity: ConflictSeverity.ERROR,
          message: 'Meeting cannot be scheduled in the past.',
          suggestions: ['Select a future date and time for the meeting'],
        })
      }
    }

    // Validate participants
    if (!data.participants || data.participants.length === 0) {
      conflicts.push({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message: 'No participants specified for the meeting.',
        suggestions: ['Add participants to the meeting invitation'],
      })
    }

    return {
      isValid:
        conflicts.filter((c) => c.severity === ConflictSeverity.ERROR)
          .length === 0,
      conflicts,
      requiredFields,
    }
  }

  /**
   * Validate Zoom-specific requirements
   */
  private validateZoomRequirement(data: MeetingFormData): ValidationResult {
    const conflicts: ConflictInfo[] = []
    const requiredFields: string[] = []

    // Note: Actual Zoom capacity checking is done asynchronously by the conflict detection engine
    // This method validates the basic Zoom configuration requirements

    if (data.isZoomMeeting) {
      // Validate Zoom password if provided
      if (data.zoomPassword && data.zoomPassword.length > 0) {
        if (data.zoomPassword.length < 4) {
          conflicts.push({
            type: ConflictType.INVALID_TYPE,
            severity: ConflictSeverity.WARNING,
            message:
              'Zoom password should be at least 4 characters long for security.',
            suggestions: ['Use a longer password for better security'],
          })
        }
      }

      // Check if we have any Zoom accounts available (basic check)
      // Note: Detailed capacity checking is done by the conflict detection engine
      this.checkBasicZoomAvailability()
        .then((hasAccounts) => {
          if (!hasAccounts) {
            conflicts.push({
              type: ConflictType.ZOOM_CAPACITY,
              severity: ConflictSeverity.ERROR,
              message:
                'No Zoom accounts are available for scheduling meetings.',
              suggestions: [
                'Contact administrator to add Zoom credentials',
                'Change meeting type to offline if Zoom is not required',
              ],
            })
          }
        })
        .catch((error) => {
          console.warn('Could not check Zoom availability:', error)
          // Don't add conflict here as this is a basic check
          // Detailed validation will be done by conflict detection engine
        })
    }

    return {
      isValid:
        conflicts.filter((c) => c.severity === ConflictSeverity.ERROR)
          .length === 0,
      conflicts,
      requiredFields,
    }
  }

  /**
   * Check if any Zoom accounts are available (basic availability check)
   */
  private async checkBasicZoomAvailability(): Promise<boolean> {
    try {
      const accounts = await zoomAccountServiceClient.getAvailableAccounts()
      return accounts.length > 0
    } catch (error) {
      // If we can't check, assume available to avoid blocking
      console.warn('Could not check Zoom account availability:', error)
      return true
    }
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }

  /**
   * Create a DateTime object from date and time strings
   */
  private createDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number)
    const dateTime = new Date(date)
    dateTime.setHours(hours, minutes, 0, 0)
    return dateTime
  }

  /**
   * Get validation rules for a specific meeting type
   */
  getValidationRulesForType(meetingType: MeetingType): string[] {
    switch (meetingType) {
      case MeetingType.OFFLINE:
        return [
          'Physical meeting room is required',
          'Zoom meeting is typically not needed',
          'All participants should be in-person',
        ]
      case MeetingType.HYBRID:
        return [
          'Physical meeting room is recommended for in-person participants',
          'Zoom meeting is recommended for remote participants',
          'Both in-person and remote participants are expected',
        ]
      case MeetingType.ONLINE:
        return [
          'Zoom meeting is required',
          'Physical meeting room is typically not needed',
          'All participants will join remotely',
        ]
      default:
        return ['Unknown meeting type']
    }
  }

  /**
   * Get required fields for a specific meeting type
   */
  getRequiredFieldsForType(meetingType: MeetingType): string[] {
    const baseFields = ['title', 'date', 'time', 'duration']

    switch (meetingType) {
      case MeetingType.OFFLINE:
        return [...baseFields, 'meetingRoomId']
      case MeetingType.HYBRID:
        return [...baseFields] // Both room and Zoom are recommended but not strictly required
      case MeetingType.ONLINE:
        return [...baseFields, 'isZoomMeeting']
      default:
        return baseFields
    }
  }

  /**
   * Check if a meeting type change is valid
   */
  validateMeetingTypeChange(
    currentData: MeetingFormData,
    newMeetingType: MeetingType,
  ): ValidationResult {
    const updatedData = { ...currentData, meetingType: newMeetingType }

    // Validate the new meeting type
    const newValidation = this.validateMeetingType(updatedData)

    // Add specific warnings about the type change
    const conflicts = [...newValidation.conflicts]

    if (currentData.meetingType !== newMeetingType) {
      // Add informational message about the change
      conflicts.unshift({
        type: ConflictType.INVALID_TYPE,
        severity: ConflictSeverity.WARNING,
        message: `Meeting type changed from ${currentData.meetingType} to ${newMeetingType}. Please review the requirements.`,
        suggestions: this.getValidationRulesForType(newMeetingType),
      })
    }

    return {
      isValid: newValidation.isValid,
      conflicts,
      requiredFields: newValidation.requiredFields,
    }
  }
}

// Export singleton instance
export const meetingTypeValidator = MeetingTypeValidatorImpl.getInstance()
