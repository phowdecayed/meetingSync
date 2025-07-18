/**
 * Client-Side Enhanced Conflict Detection Engine
 *
 * Orchestrates conflict detection from the browser by communicating with API endpoints.
 * This service runs in the browser and cannot access the database directly.
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
  SuggestionType,
  ConflictDetectionEvent,
  ConflictSubscription,
  ZoomAccountInfo,
} from '@/types/conflict-detection'

import { EventEmitter } from 'events'

export class EnhancedConflictDetectionEngineClient
  extends EventEmitter
  implements ConflictDetectionEngine
{
  private static instance: EnhancedConflictDetectionEngineClient
  private validationCache: Map<string, ConflictResult> = new Map()
  private cacheTimestamp: Map<string, Date> = new Map()
  private readonly CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes
  private subscriptions: Map<string, ConflictSubscription> = new Map()

  private constructor() {
    super()
    this.setMaxListeners(50)
  }

  public static getInstance(): EnhancedConflictDetectionEngineClient {
    if (!EnhancedConflictDetectionEngineClient.instance) {
      EnhancedConflictDetectionEngineClient.instance =
        new EnhancedConflictDetectionEngineClient()
    }
    return EnhancedConflictDetectionEngineClient.instance
  }

  /**
   * Validate a meeting and detect conflicts
   */
  async validateMeeting(meetingData: MeetingFormData): Promise<ConflictResult> {
    try {
      const cacheKey = this.generateCacheKey(meetingData)

      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        const cachedResult = this.validationCache.get(cacheKey)
        if (cachedResult) {
          return cachedResult
        }
      }

      // Call API endpoint for validation
      const response = await fetch('/api/meetings/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: ConflictResult = await response.json()

      // Cache the result
      this.validationCache.set(cacheKey, result)
      this.cacheTimestamp.set(cacheKey, new Date())

      // Emit validation event
      const event: ConflictDetectionEvent = {
        type: 'conflict_detected',
        payload: {
          meetingData,
          result,
          conflicts: result.conflicts,
        },
        timestamp: new Date(),
      }
      this.emit('conflict_detected', event)

      return result
    } catch (error) {
      console.error('Error validating meeting:', error)

      // Return safe default for graceful degradation
      return {
        conflicts: [
          {
            type: ConflictType.INVALID_TYPE,
            severity: ConflictSeverity.WARNING,
            message:
              'Unable to validate meeting at this time. Please try again.',
          },
        ],
        suggestions: [],
        canSubmit: true, // Allow submission when validation fails
      }
    }
  }

  /**
   * Subscribe to conflict detection events
   */
  subscribeToChanges(callback: (conflicts: ConflictInfo[]) => void): void {
    this.on('conflict_detected', (event: ConflictDetectionEvent) => {
      if (event.payload && event.payload.conflicts) {
        callback(event.payload.conflicts)
      }
    })
  }

  /**
   * Unsubscribe from conflict detection events
   */
  unsubscribe(): void {
    this.removeAllListeners('conflict_detected')
  }

  /**
   * Update capacity limits (triggers cache clear)
   */
  updateCapacityLimits(accounts: ZoomAccountInfo[]): void {
    console.log(`Updating capacity limits: ${accounts.length} accounts`)
    this.clearCache()
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear()
    this.cacheTimestamp.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: Date | null } {
    const timestamps = Array.from(this.cacheTimestamp.values())
    const oldestEntry =
      timestamps.length > 0
        ? new Date(Math.min(...timestamps.map((d) => d.getTime())))
        : null

    return {
      size: this.validationCache.size,
      oldestEntry,
    }
  }

  /**
   * Generate cache key for meeting data
   */
  private generateCacheKey(meetingData: MeetingFormData): string {
    const keyData = {
      title: meetingData.title,
      date: meetingData.date?.toISOString(),
      time: meetingData.time,
      duration: meetingData.duration,
      meetingType: meetingData.meetingType,
      isZoomMeeting: meetingData.isZoomMeeting,
      meetingRoomId: meetingData.meetingRoomId,
      participants: meetingData.participants?.sort().join(','),
    }

    return JSON.stringify(keyData)
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamp.get(cacheKey)
    if (!timestamp) {
      return false
    }

    const now = new Date()
    return now.getTime() - timestamp.getTime() < this.CACHE_TTL_MS
  }
}

// Export singleton instance for client-side use
export const enhancedConflictDetectionClient =
  EnhancedConflictDetectionEngineClient.getInstance()
