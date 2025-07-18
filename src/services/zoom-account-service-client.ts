import { getBaseUrl } from '@/lib/utils'
/**
 * Client-Side Zoom Account Service
 * 
 * Handles Zoom account operations from the browser by communicating with API endpoints.
 * This service runs in the browser and cannot access the database directly.
 */

import { 
  ZoomAccountService, 
  ZoomAccountInfo, 
  ZoomCapacityResult, 
  AccountLoadInfo,
  ConflictDetectionError 
} from '@/types/conflict-detection'

export class ZoomAccountServiceClient implements ZoomAccountService {
  private static instance: ZoomAccountServiceClient
  private accountCache: Map<string, ZoomAccountInfo> = new Map()
  private cacheTimestamp: Date | null = null
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
  private baseUrl: string;

  private constructor() {
    this.baseUrl = getBaseUrl();
  }

  public static getInstance(): ZoomAccountServiceClient {
    if (!ZoomAccountServiceClient.instance) {
      ZoomAccountServiceClient.instance = new ZoomAccountServiceClient()
    }
    return ZoomAccountServiceClient.instance
  }

  /**
   * Get all available Zoom accounts with their current usage
   */
  async getAvailableAccounts(): Promise<ZoomAccountInfo[]> {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        return Array.from(this.accountCache.values()).filter(account => account.isActive)
      }

      const response = await fetch(`${this.baseUrl}/api/zoom-accounts`, { credentials: 'same-origin' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const accounts: ZoomAccountInfo[] = await response.json()
      
      // Update cache
      this.accountCache.clear()
      accounts.forEach(account => {
        this.accountCache.set(account.id, account)
      })
      this.cacheTimestamp = new Date()

      return accounts.filter(account => account.isActive)
    } catch (error) {
      console.error('Error fetching Zoom accounts:', error)
      // Return empty array for graceful degradation
      return []
    }
  }

  /**
   * Check concurrent meeting capacity across all accounts for a given time slot
   */
  async checkConcurrentMeetingCapacity(
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string
  ): Promise<ZoomCapacityResult> {
    try {
      const params = new URLSearchParams({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })

      if (excludeMeetingId) {
        params.append('excludeMeetingId', excludeMeetingId)
      }

      const response = await fetch(`${this.baseUrl}/api/zoom-accounts/capacity?${params}`, { credentials: 'same-origin' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error checking Zoom capacity:', error)
      
      // Return safe default for graceful degradation
      return {
        hasAvailableAccount: false,
        totalAccounts: 0,
        totalMaxConcurrent: 0,
        currentTotalUsage: 0,
        availableSlots: 0,
        conflictingMeetings: []
      }
    }
  }

  /**
   * Find an available Zoom account for the given time slot
   */
  async findAvailableAccount(
    startTime: Date,
    endTime: Date
  ): Promise<ZoomAccountInfo | null> {
    try {
      const capacityResult = await this.checkConcurrentMeetingCapacity(startTime, endTime)
      return capacityResult.suggestedAccount || null
    } catch (error) {
      console.error('Error finding available Zoom account:', error)
      return null
    }
  }

  /**
   * Get load balancing information for all accounts
   */
  async getAccountLoadBalancing(): Promise<AccountLoadInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zoom-accounts/load-balancing`, { credentials: 'same-origin' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting account load balancing info:', error)
      return []
    }
  }

  /**
   * Update account capacity (for future extensibility)
   */
  async updateAccountCapacity(accountId: string, capacity: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zoom-accounts/${accountId}/capacity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ capacity }),
        credentials: 'same-origin'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Clear cache to force refresh
      this.clearCache()
    } catch (error) {
      console.error('Error updating account capacity:', error)
      throw new ConflictDetectionError(
        'Failed to update account capacity',
        'resource',
        false
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
      return accounts.find(account => account.id === leastLoadedAccountId) || null
    } catch (error) {
      console.error('Error getting least loaded account:', error)
      return null
    }
  }

  /**
   * Count concurrent meetings for a specific account in a time slot
   */
  async countConcurrentMeetings(
    accountId: string,
    startTime: Date,
    endTime: Date,
    excludeMeetingId?: string
  ): Promise<number> {
    try {
      const params = new URLSearchParams({
        accountId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })

      if (excludeMeetingId) {
        params.append('excludeMeetingId', excludeMeetingId)
      }

      const response = await fetch(`${this.baseUrl}/api/zoom-accounts/concurrent-meetings?${params}`, { credentials: 'same-origin' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.count || 0
    } catch (error) {
      console.error('Error counting concurrent meetings:', error)
      return 0
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
  public getCacheStats(): { size: number; lastUpdated: Date | null; isExpired: boolean } {
    const now = new Date()
    const isExpired = !this.cacheTimestamp || 
      (now.getTime() - this.cacheTimestamp.getTime()) >= this.CACHE_TTL_MS

    return {
      size: this.accountCache.size,
      lastUpdated: this.cacheTimestamp,
      isExpired
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cacheTimestamp) {
      return false
    }

    const now = new Date()
    return (now.getTime() - this.cacheTimestamp.getTime()) < this.CACHE_TTL_MS
  }
}

// Export singleton instance for client-side use
export const zoomAccountServiceClient = ZoomAccountServiceClient.getInstance()