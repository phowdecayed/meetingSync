/**
 * Conflict Resolution Service
 * 
 * Generates actionable suggestions for meeting conflicts with prioritization
 * and feasibility scoring. Handles room alternatives, time slot suggestions,
 * and meeting type adjustments.
 */

import { 
  ConflictResolutionService,
  ConflictInfo,
  ConflictSuggestion,
  SuggestionAction,
  SuggestionType,
  ConflictType,
  MeetingFormData,
  MeetingType,
  TimeSlot,
  MeetingRoomInfo
} from '@/types/conflict-detection'
import { roomAvailabilityService } from './room-availability-service'
import { zoomAccountServiceClient } from './zoom-account-service-client'
import prisma from '@/lib/prisma'

export class ConflictResolutionServiceImpl implements ConflictResolutionService {
  private readonly MAX_SUGGESTIONS = 8
  private readonly SUGGESTION_PRIORITIES = {
    ROOM_CHANGE: 1,
    TIME_CHANGE: 2,
    TYPE_CHANGE: 3,
    DURATION_CHANGE: 4
  }

  /**
   * The single, authoritative function for generating suggestions for all conflicts.
   */
  async generateComprehensiveSuggestions(
    conflicts: ConflictInfo[],
    meetingData: MeetingFormData
  ): Promise<ConflictSuggestion[]> {
    const suggestions: ConflictSuggestion[] = []
    let suggestionId = 1

    for (const conflict of conflicts) {
      let conflictSuggestions: ConflictSuggestion[] = []
      switch (conflict.type) {
        case ConflictType.ROOM_CONFLICT:
          conflictSuggestions = await this.generateRoomConflictSuggestions(
            conflict,
            meetingData,
            suggestionId,
          )
          break
        case ConflictType.MISSING_ROOM:
          conflictSuggestions = this.generateMissingRoomSuggestions(
            conflict,
            meetingData,
            suggestionId,
          )
          break
        case ConflictType.ZOOM_CAPACITY:
          conflictSuggestions = await this.generateZoomCapacitySuggestions(
            conflict,
            meetingData,
            suggestionId,
          )
          break
        case ConflictType.INVALID_TYPE:
          conflictSuggestions = this.generateInvalidTypeSuggestions(
            conflict,
            meetingData,
            suggestionId,
          )
          break
      }
      suggestions.push(...conflictSuggestions)
      suggestionId += conflictSuggestions.length
    }

    return this.prioritizeSuggestions(suggestions)
  }

  /**
   * Generate suggestions for room conflicts
   */
  private async generateRoomConflictSuggestions(
    conflict: ConflictInfo,
    meetingData: MeetingFormData,
    startId: number = 1,
  ): Promise<ConflictSuggestion[]> {
    const suggestions: ConflictSuggestion[] = []
    let suggestionId = startId

    if (meetingData.date && meetingData.time && meetingData.duration) {
      const startTime = this.createDateTime(meetingData.date, meetingData.time)
      const endTime = new Date(
        startTime.getTime() + meetingData.duration * 60 * 1000,
      )
      const participantCount = (meetingData.participants?.length || 0) + 1

      const roomSuggestions = await this.getRoomSuggestions(
        startTime,
        endTime,
        participantCount,
        meetingData.meetingRoomId,
      )

      roomSuggestions.forEach((room) => {
        suggestions.push({
          id: `suggestion-${suggestionId++}`,
          type: SuggestionType.ROOM_CHANGE,
          description: `Use ${room.name} (capacity: ${room.capacity})`,
          action: {
            field: 'meetingRoomId',
            value: room.id,
            additionalChanges: {},
          },
          priority: this.calculatePriority(
            SuggestionType.ROOM_CHANGE,
            room.feasibilityScore,
          ),
        })
      })
    }

    return suggestions
  }

  /**
   * Generate suggestions for missing room requirements
   */
  private generateMissingRoomSuggestions(
    conflict: ConflictInfo,
    meetingData: MeetingFormData,
    startId: number = 1,
  ): ConflictSuggestion[] {
    const suggestions: ConflictSuggestion[] = []
    let suggestionId = startId

    suggestions.push({
      id: `suggestion-${suggestionId++}`,
      type: SuggestionType.ROOM_CHANGE,
      description: 'Select a meeting room for this offline meeting',
      action: {
        field: 'meetingRoomId',
        value: 'auto-select',
        additionalChanges: {},
      },
      priority: this.calculatePriority(SuggestionType.ROOM_CHANGE, 0.9),
    })

    if (meetingData?.meetingType === MeetingType.OFFLINE) {
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: SuggestionType.TYPE_CHANGE,
        description: 'Change to online meeting (no room required)',
        action: {
          field: 'meetingType',
          value: MeetingType.ONLINE,
          additionalChanges: {
            isZoomMeeting: true,
            meetingRoomId: undefined,
          },
        },
        priority: this.calculatePriority(SuggestionType.TYPE_CHANGE, 0.6),
      })
    }

    return suggestions
  }

  /**
   * Generate suggestions for Zoom capacity conflicts
   */
  private async generateZoomCapacitySuggestions(
    conflict: ConflictInfo,
    meetingData: MeetingFormData,
    startId: number = 1,
  ): Promise<ConflictSuggestion[]> {
    const suggestions: ConflictSuggestion[] = []
    let suggestionId = startId

    if (meetingData.date && meetingData.time && meetingData.duration) {
      const zoomSlots = await this.findAvailableZoomSlots(meetingData)
      zoomSlots.forEach((slot) => {
        suggestions.push({
          id: `suggestion-${suggestionId++}`,
          type: SuggestionType.TIME_CHANGE,
          description: `Try at ${this.formatTime(slot)} (Zoom available)`,
          action: {
            field: 'time',
            value: this.formatTime(slot),
            additionalChanges: {},
          },
          priority: this.calculatePriority(SuggestionType.TIME_CHANGE, 0.85),
        })
      })
    }

    if (
      meetingData.meetingType === MeetingType.ONLINE ||
      meetingData.meetingType === MeetingType.HYBRID
    ) {
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: SuggestionType.TYPE_CHANGE,
        description: 'Change to offline meeting (no Zoom required)',
        action: {
          field: 'meetingType',
          value: MeetingType.OFFLINE,
          additionalChanges: {
            isZoomMeeting: false,
            meetingRoomId: meetingData.meetingRoomId || 'auto-select',
          },
        },
        priority: this.calculatePriority(SuggestionType.TYPE_CHANGE, 0.7),
      })
    }

    return suggestions
  }

  /**
   * Finds available time slots for Zoom meetings by checking capacity.
   */
  private async findAvailableZoomSlots(
    meetingData: MeetingFormData,
    limit: number = 3,
  ): Promise<Date[]> {
    const availableSlots: Date[] = []
    const initialStartTime = this.createDateTime(
      meetingData.date,
      meetingData.time,
    )
    let searchTime = new Date(initialStartTime.getTime() + 15 * 60 * 1000)
    const searchLimit = new Date(searchTime)
    searchLimit.setHours(searchLimit.getHours() + 8)

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

      searchTime.setTime(searchTime.getTime() + 15 * 60 * 1000)
    }

    return availableSlots
  }

  /**
   * Generate suggestions for invalid meeting type configurations
   */
  private generateInvalidTypeSuggestions(
    conflict: ConflictInfo,
    meetingData: MeetingFormData,
    startId: number = 1,
  ): ConflictSuggestion[] {
    const suggestions: ConflictSuggestion[] = []
    let suggestionId = startId

    if (!meetingData) return suggestions

    if (conflict.suggestions) {
      conflict.suggestions.forEach((suggestion) => {
        if (suggestion.includes('Enable Zoom')) {
          suggestions.push({
            id: `suggestion-${suggestionId++}`,
            type: SuggestionType.TYPE_CHANGE,
            description: suggestion,
            action: {
              field: 'isZoomMeeting',
              value: true,
              additionalChanges: {},
            },
            priority: this.calculatePriority(SuggestionType.TYPE_CHANGE, 0.8),
          })
        } else if (suggestion.includes('Disable Zoom')) {
          suggestions.push({
            id: `suggestion-${suggestionId++}`,
            type: SuggestionType.TYPE_CHANGE,
            description: suggestion,
            action: {
              field: 'isZoomMeeting',
              value: false,
              additionalChanges: {},
            },
            priority: this.calculatePriority(SuggestionType.TYPE_CHANGE, 0.8),
          })
        }
      })
    }

    return suggestions
  }

  /**
   * Prioritize suggestions based on type, feasibility, and user preference
   */
  private prioritizeSuggestions(
    suggestions: ConflictSuggestion[],
  ): ConflictSuggestion[] {
    return suggestions
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        const typeOrderA = this.getSuggestionTypeOrder(a.type)
        const typeOrderB = this.getSuggestionTypeOrder(b.type)
        return typeOrderA - typeOrderB
      })
      .slice(0, this.MAX_SUGGESTIONS)
  }

  /**
   * Calculate priority score based on suggestion type and feasibility
   */
  private calculatePriority(
    type: SuggestionType,
    feasibilityScore: number,
  ): number {
    const basePriority =
      this.SUGGESTION_PRIORITIES[
        type.toUpperCase() as keyof typeof this.SUGGESTION_PRIORITIES
      ] || 5
    return Math.max(1, Math.round(basePriority - feasibilityScore * 2))
  }

  /**
   * Get suggestion type order for secondary sorting
   */
  private getSuggestionTypeOrder(type: SuggestionType): number {
    const order = {
      [SuggestionType.ROOM_CHANGE]: 1,
      [SuggestionType.TIME_CHANGE]: 2,
      [SuggestionType.TYPE_CHANGE]: 3,
    }
    return order[type] || 4
  }

  /**
   * Format Date object to time string
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  /**
   * Get room suggestions with feasibility scoring
   */
  async getRoomSuggestions(
    startTime: Date,
    endTime: Date,
    participantCount: number,
    excludeRoomId?: string,
  ): Promise<Array<MeetingRoomInfo & { feasibilityScore: number }>> {
    try {
      const availableRooms = await roomAvailabilityService.findOptimalRooms(
        startTime,
        endTime,
        participantCount,
      )

      if (!availableRooms || !Array.isArray(availableRooms)) {
        return []
      }

      return availableRooms
        .filter((room) => room.id !== excludeRoomId)
        .map((room) => ({
          ...room,
          feasibilityScore: this.calculateRoomFeasibilityScore(
            room,
            participantCount,
          ),
        }))
        .sort((a, b) => b.feasibilityScore - a.feasibilityScore)
        .slice(0, 5)
    } catch (error) {
      console.error('Error getting room suggestions:', error)
      return []
    }
  }

  /**
   * Calculate feasibility score for a room suggestion
   */
  private calculateRoomFeasibilityScore(
    room: MeetingRoomInfo,
    participantCount: number,
  ): number {
    let score = 0.5

    if (room.capacity >= participantCount) {
      const capacityRatio = participantCount / room.capacity
      if (capacityRatio >= 0.5 && capacityRatio <= 0.8) {
        score += 0.4
      } else if (capacityRatio >= 0.3) {
        score += 0.2
      } else {
        score += 0.1
      }
    } else {
      score -= 0.3
    }

    if (room.isActive) {
      score += 0.1
    }

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Helper method to create DateTime from date and time
   */
  private createDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number)
    const dateTime = new Date(date)
    dateTime.setHours(hours, minutes, 0, 0)
    return dateTime
  }
}

// Export singleton instance
export const conflictResolutionService = new ConflictResolutionServiceImpl()
