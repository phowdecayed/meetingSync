/**
 * Zoom Account Service
 *
 * Handles concurrent meeting tracking and capacity management for multiple Zoom accounts.
 * Implements load balancing and validation for Zoom meeting scheduling.
 */

import prisma from '@/lib/prisma'
import {
  ZoomAccountService,
  ZoomAccountInfo,
  ZoomCapacityResult,
  AccountLoadInfo,
  ScheduledMeeting,
  ConflictDetectionError,
} from '@/types/conflict-detection'

export class ZoomAccountServiceImpl implements ZoomAccountService {
  private static instance: ZoomAccountServiceImpl
  private accountCache: Map<string, ZoomAccountInfo> = new Map()
  private cacheTimestamp: Date | null = null
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CONCURRENT_MEETINGS = 2 // Zoom limit per account

  private constructor() {}

  public static getInstance(): ZoomAccountServiceImpl {
    if (!ZoomAccountServiceImpl.instance) {
      ZoomAccountServiceImpl.instance = new ZoomAccountServiceImpl()
    }
    return ZoomAccountServiceImpl.instance
  }

  /**
   * Get all available Zoom accounts with their current usage
   */
  async getAvailableAccounts(): Promise<ZoomAccountInfo[]> {
    await this.refreshAccountCache()
    return Array.from(this.accountCache.values()).filter(
      (account) => account.isActive,
    )
  }

  /**
   * Check concurrent meeting capacity across all accounts for a given time slot
   */
  async checkConcurrentMeetingCapacity(
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string,
  ): Promise<ZoomCapacityResult> {
    try {
      const accounts = await this.getAvailableAccounts()

      if (accounts.length === 0) {
        return {
          hasAvailableAccount: false,
          totalAccounts: 0,
          totalMaxConcurrent: 0,
          currentTotalUsage: 0,
          availableSlots: 0,
          conflictingMeetings: [],
        }
      }

      // Get all meetings that overlap with the requested time slot
      const overlappingMeetings = await this.getOverlappingMeetings(
        startTime,
        endTime,
        excludeMeetingId,
      )

      // Calculate capacity usage for each account
      const accountUsage = new Map<string, number>()
      const conflictingMeetings: ScheduledMeeting[] = []

      // Initialize account usage
      accounts.forEach((account) => {
        accountUsage.set(account.id, 0)
      })

      // Count overlapping meetings per account
      overlappingMeetings.forEach((meeting) => {
        if (meeting.zoomAccountId) {
          const currentUsage = accountUsage.get(meeting.zoomAccountId) || 0
          accountUsage.set(meeting.zoomAccountId, currentUsage + 1)
          conflictingMeetings.push(meeting)
        }
      })

      // Calculate totals
      const totalMaxConcurrent = accounts.length * this.MAX_CONCURRENT_MEETINGS
      const currentTotalUsage = Array.from(accountUsage.values()).reduce(
        (sum, usage) => sum + usage,
        0,
      )
      const availableSlots = totalMaxConcurrent - currentTotalUsage

      // Find an available account (one with less than max concurrent meetings)
      const suggestedAccount = accounts.find((account) => {
        const usage = accountUsage.get(account.id) || 0
        return usage < this.MAX_CONCURRENT_MEETINGS
      })

      return {
        hasAvailableAccount: !!suggestedAccount,
        totalAccounts: accounts.length,
        totalMaxConcurrent,
        currentTotalUsage,
        availableSlots: Math.max(0, availableSlots),
        suggestedAccount,
        conflictingMeetings,
      }
    } catch {
      throw new ConflictDetectionError(
        'Failed to check Zoom capacity',
        'validation',
        true,
      )
    }
  }

  /**
   * Find an available Zoom account for the given time slot
   */
  async findAvailableAccount(
    startTime: Date,
    endTime: Date,
  ): Promise<ZoomAccountInfo | null> {
    try {
      const capacityResult = await this.checkConcurrentMeetingCapacity(
        startTime,
        endTime,
      )
      return capacityResult.suggestedAccount || null
    } catch {
      throw new ConflictDetectionError(
        'Failed to find available Zoom account',
        'resource',
        true,
      )
    }
  }

  /**
   * Get load balancing information for all accounts
   */
  async getAccountLoadBalancing(): Promise<AccountLoadInfo[]> {
    try {
      const accounts = await this.getAvailableAccounts()
      const loadInfo: AccountLoadInfo[] = []

      for (const account of accounts) {
        const currentLoad = account.currentActiveMeetings
        const maxCapacity = this.MAX_CONCURRENT_MEETINGS
        const utilizationPercentage = (currentLoad / maxCapacity) * 100

        loadInfo.push({
          accountId: account.id,
          currentLoad,
          maxCapacity,
          utilizationPercentage,
        })
      }

      // Sort by utilization percentage (ascending) for load balancing
      return loadInfo.sort(
        (a, b) => a.utilizationPercentage - b.utilizationPercentage,
      )
    } catch {
      throw new ConflictDetectionError(
        'Failed to get account load balancing info',
        'resource',
        true,
      )
    }
  }

  /**
   * Update account capacity (for future extensibility)
   */
  async updateAccountCapacity(
    accountId: string,
    capacity: number,
  ): Promise<void> {
    try {
      // For now, we use a fixed capacity of 2 per Zoom's limits
      // This method is for future extensibility when Zoom might allow different limits
      const account = this.accountCache.get(accountId)
      if (account) {
        account.maxConcurrentMeetings = capacity
      }
    } catch {
      throw new ConflictDetectionError(
        'Failed to update account capacity',
        'resource',
        false,
      )
    }
  }

  /**
   * Get the least loaded account for load balancing
   */
  async getLeastLoadedAccount(): Promise<ZoomAccountInfo | null> {
    try {
      const loadInfo = await this.getAccountLoadBalancing()
      if (loadInfo.length === 0) {
        return null
      }

      const leastLoadedAccountId = loadInfo[0].accountId
      const accounts = await this.getAvailableAccounts()
      return (
        accounts.find((account) => account.id === leastLoadedAccountId) || null
      )
    } catch {
      throw new ConflictDetectionError(
        'Failed to get least loaded account',
        'resource',
        true,
      )
    }
  }

  /**
   * Count concurrent meetings for a specific account in a time slot
   */
  async countConcurrentMeetings(
    accountId: string,
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string,
  ): Promise<number> {
    try {
      const overlappingMeetings = await this.getOverlappingMeetings(
        startTime,
        endTime,
        excludeMeetingId,
      )

      return overlappingMeetings.filter(
        (meeting) => meeting.zoomAccountId === accountId,
      ).length
    } catch {
      throw new ConflictDetectionError(
        'Failed to count concurrent meetings',
        'validation',
        true,
      )
    }
  }

  /**
   * Refresh the account cache from database
   */
  private async refreshAccountCache(): Promise<void> {
    const now = new Date()

    // Check if cache is still valid
    if (
      this.cacheTimestamp &&
      now.getTime() - this.cacheTimestamp.getTime() < this.CACHE_TTL_MS
    ) {
      return
    }

    try {
      // Test database connection first
      await prisma.$queryRaw`SELECT 1`

      // Fetch Zoom credentials from database
      const credentials = await prisma.zoomCredentials.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          meetings: {
            where: {
              deletedAt: null,
              isZoomMeeting: true,
            },
          },
        },
      })

      // Clear existing cache
      this.accountCache.clear()

      // Build account info for each credential
      for (const credential of credentials) {
        const accountInfo: ZoomAccountInfo = {
          id: credential.id,
          email: `account-${credential.accountId}`, // We don't store email, use account ID
          isActive: true,
          maxConcurrentMeetings: this.MAX_CONCURRENT_MEETINGS,
          maxParticipants: 1000, // Standard Zoom limit
          currentActiveMeetings: 0, // Will be calculated dynamically
          scheduledMeetings: credential.meetings.map((meeting) => ({
            id: meeting.id,
            title: meeting.title,
            startTime: meeting.date,
            endTime: new Date(
              meeting.date.getTime() + meeting.duration * 60 * 1000,
            ),
            participants: meeting.participants
              .split(',')
              .filter((p) => p.trim()),
            zoomAccountId: credential.id,
          })),
        }

        this.accountCache.set(credential.id, accountInfo)
      }

      this.cacheTimestamp = now
      console.log(
        `Refreshed Zoom account cache: ${credentials.length} accounts found`,
      )
    } catch (error) {
      console.error('Failed to refresh account cache:', error)

      // Don't throw error, just log it and continue with empty cache
      // This allows the application to continue working even if Zoom accounts aren't configured
      this.accountCache.clear()
      this.cacheTimestamp = now
    }
  }

  /**
   * Get meetings that overlap with the given time range
   */
  private async getOverlappingMeetings(
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string,
  ): Promise<ScheduledMeeting[]> {
    try {
      // Test database connection first
      await prisma.$queryRaw`SELECT 1`

      const meetings = await prisma.meeting.findMany({
        where: {
          deletedAt: null,
          isZoomMeeting: true,
          zoomCredentialId: { not: null },
          id: excludeMeetingId ? { not: excludeMeetingId } : undefined,
          OR: [
            // Meeting starts during the time slot
            {
              date: {
                gte: startTime,
                lt: endTime,
              },
            },
            // Meeting ends during the time slot
            {
              AND: [
                { date: { lt: startTime } },
                // Calculate end time: date + duration in minutes
                {
                  date: {
                    gte: new Date(startTime.getTime() - 24 * 60 * 60 * 1000), // Look back 24 hours max
                  },
                },
              ],
            },
          ],
        },
        include: {
          zoomCredential: true,
        },
      })

      // Filter meetings that actually overlap (since Prisma query is approximate)
      return meetings
        .filter((meeting) => {
          const meetingStart = meeting.date
          const meetingEnd = new Date(
            meeting.date.getTime() + meeting.duration * 60 * 1000,
          )

          // Check if meetings overlap
          return meetingStart < endTime && meetingEnd > startTime
        })
        .map((meeting) => ({
          id: meeting.id,
          title: meeting.title,
          startTime: meeting.date,
          endTime: new Date(
            meeting.date.getTime() + meeting.duration * 60 * 1000,
          ),
          participants: meeting.participants.split(',').filter((p) => p.trim()),
          zoomAccountId: meeting.zoomCredentialId!,
        }))
    } catch (error) {
      console.error('Failed to get overlapping meetings:', error)

      // Return empty array instead of throwing error for graceful degradation
      return []
    }
  }

  /**
   * Clear the cache (useful for testing or when credentials change)
   */
  public clearCache(): void {
    this.accountCache.clear()
    this.cacheTimestamp = null
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  public getCacheStats(): {
    size: number
    lastUpdated: Date | null
    isExpired: boolean
  } {
    const now = new Date()
    const isExpired =
      !this.cacheTimestamp ||
      now.getTime() - this.cacheTimestamp.getTime() >= this.CACHE_TTL_MS

    return {
      size: this.accountCache.size,
      lastUpdated: this.cacheTimestamp,
      isExpired,
    }
  }
}

// Export singleton instance
export const zoomAccountService = ZoomAccountServiceImpl.getInstance()
