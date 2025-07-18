/**
 * Enhanced Conflict Detection Engine
 *
 * Orchestrates conflict detection across different meeting types and resources,
 * with real-time validation and suggestion generation.
 */

import {
  ConflictDetectionEngine,
  ConflictResult,
  ConflictInfo,
  MeetingFormData,
  MeetingType,
  ConflictType,
  ConflictSeverity,
  ConflictSuggestion,
  ConflictDetectionEvent,
  ConflictSubscription,
  ZoomAccountInfo,
} from '@/types/conflict-detection'
import { roomAvailabilityService } from './room-availability-service'
import { meetingTypeValidator } from './meeting-type-validator'
import { conflictResolutionService } from './conflict-resolution-service'
import { zoomAccountServiceClient } from './zoom-account-service-client'
import { EventEmitter } from 'events'

export class EnhancedConflictDetectionEngine
  extends EventEmitter
  implements ConflictDetectionEngine
{
  private subscriptions: Map<string, ConflictSubscription> = new Map()
  private validationCache: Map<
    string,
    { result: ConflictResult; timestamp: Date }
  > = new Map()
  private readonly CACHE_TTL_MS = 30000 // 30 seconds cache

  constructor() {
    super()
    this.setMaxListeners(50) // Allow more listeners for real-time updates
  }

  /**
   * Main validation method that orchestrates all conflict checks
   */
  async validateMeeting(meetingData: MeetingFormData): Promise<ConflictResult> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(meetingData)

      // Check cache first
      const cached = this.validationCache.get(cacheKey)
      if (
        cached &&
        Date.now() - cached.timestamp.getTime() < this.CACHE_TTL_MS
      ) {
        return cached.result
      }

      const conflicts: ConflictInfo[] = []
      const suggestions: ConflictSuggestion[] = []

      // 1. Validate meeting type requirements
      const typeConflicts = this.validateMeetingTypeRequirements(meetingData)
      conflicts.push(...typeConflicts)

      // 2. Validate room availability if room is selected or required
      if (
        meetingData.meetingRoomId ||
        this.requiresRoom(meetingData.meetingType)
      ) {
        const roomConflicts = await this.validateRoomAvailability(meetingData)
        conflicts.push(...roomConflicts)
      }

      // 3. Validate Zoom capacity only if it's explicitly a Zoom meeting
      if (
        meetingData.isZoomMeeting &&
        (meetingData.meetingType === MeetingType.ONLINE ||
          meetingData.meetingType === MeetingType.HYBRID)
      ) {
        const zoomConflicts = await this.validateZoomCapacity(meetingData)
        conflicts.push(...zoomConflicts)
      }

      // 4. Generate suggestions for all conflicts
      const generatedSuggestions = await this.generateSuggestions(
        conflicts,
        meetingData,
      )
      suggestions.push(...generatedSuggestions)

      const result: ConflictResult = {
        conflicts,
        canSubmit: !conflicts.some(
          (c) => c.severity === ConflictSeverity.ERROR,
        ),
        suggestions,
      }

      // Cache the result
      this.validationCache.set(cacheKey, { result, timestamp: new Date() })

      // Emit validation event
      this.emitEvent({
        type: conflicts.length > 0 ? 'conflict_detected' : 'conflict_resolved',
        payload: { meetingData, conflicts },
        timestamp: new Date(),
      })

      return result
    } catch (error) {
      console.error('Error in conflict validation:', error)

      // Return error state
      return {
        conflicts: [
          {
            type: ConflictType.INVALID_TYPE,
            severity: ConflictSeverity.ERROR,
            message: 'Unable to validate meeting conflicts. Please try again.',
          },
        ],
        canSubmit: false,
        suggestions: [],
      }
    }
  }

  /**
   * Validate meeting type specific requirements using the MeetingTypeValidator
   */
  private validateMeetingTypeRequirements(
    meetingData: MeetingFormData,
  ): ConflictInfo[] {
    try {
      const validationResult =
        meetingTypeValidator.validateMeetingType(meetingData)
      return validationResult.conflicts
    } catch (error) {
      console.error('Error validating meeting type requirements:', error)
      return [
        {
          type: ConflictType.INVALID_TYPE,
          severity: ConflictSeverity.ERROR,
          message:
            'Unable to validate meeting type requirements. Please try again.',
        },
      ]
    }
  }

  /**
   * Validate room availability and conflicts
   */
  private async validateRoomAvailability(
    meetingData: MeetingFormData,
  ): Promise<ConflictInfo[]> {
    if (!meetingData.meetingRoomId) {
      return []
    }

    try {
      const startTime = this.createDateTime(meetingData.date, meetingData.time)
      const endTime = new Date(
        startTime.getTime() + meetingData.duration * 60 * 1000,
      )

      const roomConflict =
        await roomAvailabilityService.generateRoomConflictInfo(
          meetingData.meetingRoomId,
          startTime,
          endTime,
        )

      return roomConflict ? [roomConflict] : []
    } catch (error) {
      console.error('Error validating room availability:', error)
      return [
        {
          type: ConflictType.ROOM_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Unable to check room availability. Please try again.',
          affectedResource: meetingData.meetingRoomId,
        },
      ]
    }
  }

  /**
   * Validate Zoom capacity and conflicts
   */
  private async validateZoomCapacity(
    meetingData: MeetingFormData,
  ): Promise<ConflictInfo[]> {
    try {
      const startTime = this.createDateTime(meetingData.date, meetingData.time)
      const endTime = new Date(
        startTime.getTime() + meetingData.duration * 60 * 1000,
      )

      const capacityResult =
        await zoomAccountServiceClient.checkConcurrentMeetingCapacity(
          startTime,
          endTime,
        )

      if (!capacityResult.hasAvailableAccount) {
        const suggestions = await this.findAvailableZoomSlots(meetingData)
        const suggestionMessages =
          suggestions.length > 0
            ? suggestions.map(
                (slot) =>
                  `Try at ${slot.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}`,
              )
            : [
                'No immediate slots available. Please try a different day or a much later time.',
              ]

        return [
          {
            type: ConflictType.ZOOM_CAPACITY,
            severity: ConflictSeverity.ERROR,
            message:
              capacityResult.totalAccounts === 0
                ? 'No Zoom accounts are configured. Please contact your administrator.'
                : `All Zoom accounts are at capacity (${capacityResult.currentTotalUsage}/${capacityResult.totalMaxConcurrent} meetings). Please choose a different time.`,
            conflictingMeetings: capacityResult.conflictingMeetings.map(
              (meeting) => ({
                title: meeting.title,
                time: new Date(meeting.startTime).toLocaleTimeString(),
                participants: meeting.participants,
                zoomAccount: meeting.zoomAccountId,
              }),
            ),
            suggestions: suggestionMessages,
          },
        ]
      }

      // Warning if capacity is getting low
      if (
        capacityResult.availableSlots <= 1 &&
        capacityResult.totalAccounts > 1
      ) {
        return [
          {
            type: ConflictType.ZOOM_CAPACITY,
            severity: ConflictSeverity.WARNING,
            message: `Zoom capacity is running low. Only ${capacityResult.availableSlots} slot(s) remaining.`,
          },
        ]
      }

      return []
    } catch (error) {
      console.error('Error validating Zoom capacity:', error)
      return [
        {
          type: ConflictType.ZOOM_CAPACITY,
          severity: ConflictSeverity.ERROR,
          message: 'Unable to check Zoom capacity. Please try again.',
        },
      ]
    }
  }

  private async findAvailableZoomSlots(
    meetingData: MeetingFormData,
    limit: number = 3,
  ): Promise<Date[]> {
    const availableSlots: Date[] = []
    const initialStartTime = this.createDateTime(
      meetingData.date,
      meetingData.time,
    )
    const searchTime = new Date(initialStartTime.getTime() + 15 * 60 * 1000) // Start searching 15 mins after original time
    const searchLimit = new Date(searchTime)
    searchLimit.setHours(searchLimit.getHours() + 8) // Limit search to 8 hours ahead

    while (availableSlots.length < limit && searchTime < searchLimit) {
      const endTime = new Date(
        searchTime.getTime() + meetingData.duration * 60 * 1000,
      )

      const capacity =
        await zoomAccountServiceClient.checkConcurrentMeetingCapacity(
          searchTime,
          endTime,
        )

      if (capacity.hasAvailableAccount) {
        availableSlots.push(new Date(searchTime))
      }

      // Move to the next 15-minute slot
      searchTime.setTime(searchTime.getTime() + 15 * 60 * 1000)
    }

    return availableSlots
  }

  /**
   * Generate actionable suggestions for conflicts using ConflictResolutionService
   */
  private async generateSuggestions(
    conflicts: ConflictInfo[],
    meetingData: MeetingFormData,
  ): Promise<ConflictSuggestion[]> {
    try {
      // Use the comprehensive suggestion generation from ConflictResolutionService
      return await conflictResolutionService.generateComprehensiveSuggestions(
        conflicts,
        meetingData,
      )
    } catch (error) {
      console.error('Error generating comprehensive suggestions:', error)

      // Fallback to basic suggestion generation
      return []
    }
  }

  /**
   * Subscribe to conflict detection events
   */
  subscribeToChanges(callback: (conflicts: ConflictInfo[]) => void): void {
    const subscriptionId = `sub-${Date.now()}-${Math.random()}`
    const subscription: ConflictSubscription = {
      id: subscriptionId,
      callback: (event) => {
        if (
          event.type === 'conflict_detected' ||
          event.type === 'conflict_resolved'
        ) {
          callback(event.payload.conflicts || [])
        }
      },
    }

    this.subscriptions.set(subscriptionId, subscription)
    this.on('conflict_event', subscription.callback)
  }

  /**
   * Update capacity limits (for future Zoom integration)
   */
  updateCapacityLimits(zoomCredentials: ZoomAccountInfo[]): void {
    // Clear cache when capacity changes
    this.validationCache.clear()

    this.emitEvent({
      type: 'capacity_updated',
      payload: { zoomCredentials },
      timestamp: new Date(),
    })
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(): void {
    this.subscriptions.forEach((subscription) => {
      this.off('conflict_event', subscription.callback)
    })
    this.subscriptions.clear()
    this.removeAllListeners()
  }

  /**
   * Helper methods
   */
  private requiresRoom(meetingType: MeetingType): boolean {
    return meetingType === MeetingType.OFFLINE
  }

  private createDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number)
    const dateTime = new Date(date)
    dateTime.setHours(hours, minutes, 0, 0)
    return dateTime
  }

  private generateCacheKey(meetingData: MeetingFormData): string {
    return `${meetingData.date.toISOString()}-${meetingData.time}-${meetingData.duration}-${meetingData.meetingRoomId || 'no-room'}-${meetingData.meetingType}`
  }

  private emitEvent(event: ConflictDetectionEvent): void {
    this.emit('conflict_event', event)
  }

  /**
   * Clear validation cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.validationCache.clear()
  }

  /**
   * Get current cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: Date | null } {
    const entries = Array.from(this.validationCache.values())
    return {
      size: entries.length,
      oldestEntry:
        entries.length > 0
          ? entries.reduce(
              (oldest, entry) =>
                entry.timestamp < oldest ? entry.timestamp : oldest,
              entries[0].timestamp,
            )
          : null,
    }
  }
}

// Export singleton instance
export const enhancedConflictDetection = new EnhancedConflictDetectionEngine()
