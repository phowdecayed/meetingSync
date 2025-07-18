/**
 * Client-Side Settings Integration Service
 *
 * Handles settings integration from the browser by communicating with API endpoints.
 * This service runs in the browser and provides real-time updates through polling.
 */

import { EventEmitter } from 'events'
import { zoomAccountServiceClient } from './zoom-account-service-client'
import { enhancedConflictDetectionClient } from './enhanced-conflict-detection-client'
import {
  SettingsIntegrationService,
  SettingsChangeEvent,
  ConflictNotification,
  CapacityUpdateEvent,
  ZoomAccountChangeType,
} from '@/types/conflict-detection'

export class SettingsIntegrationServiceClient
  extends EventEmitter
  implements SettingsIntegrationService
{
  private static instance: SettingsIntegrationServiceClient
  private isInitialized = false
  private currentZoomAccounts: string[] = []
  private notificationQueue: ConflictNotification[] = []
  private readonly MAX_NOTIFICATION_QUEUE = 50
  private pollingInterval: NodeJS.Timeout | null = null

  private constructor() {
    super()
    this.setMaxListeners(100) // Allow many listeners for real-time updates
  }

  public static getInstance(): SettingsIntegrationServiceClient {
    if (!SettingsIntegrationServiceClient.instance) {
      SettingsIntegrationServiceClient.instance =
        new SettingsIntegrationServiceClient()
    }
    return SettingsIntegrationServiceClient.instance
  }

  /**
   * Initialize the service and set up monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Get initial state of Zoom accounts
      const accounts = await zoomAccountServiceClient.getAvailableAccounts()
      this.currentZoomAccounts = accounts.map((account) => account.id)

      // Set up periodic monitoring for changes
      this.startPeriodicMonitoring()

      this.isInitialized = true
      console.log(
        `Settings Integration Service (Client) initialized with ${accounts.length} Zoom accounts`,
      )
    } catch (error) {
      console.error(
        'Failed to initialize Settings Integration Service (Client):',
        error,
      )

      // Initialize with empty state instead of throwing error
      this.currentZoomAccounts = []
      this.isInitialized = true
      console.log(
        'Settings Integration Service (Client) initialized with no Zoom accounts (graceful degradation)',
      )
    }
  }

  /**
   * Handle Zoom account changes (add/remove/update)
   */
  async handleZoomAccountChange(
    changeType: ZoomAccountChangeType,
    accountId: string,
    accountData?: any,
  ): Promise<void> {
    try {
      // Clear zoom account service cache to force refresh
      zoomAccountServiceClient.clearCache()

      // Get updated account list
      const updatedAccounts =
        await zoomAccountServiceClient.getAvailableAccounts()
      const newAccountIds = updatedAccounts.map((account) => account.id)

      // Determine what changed
      const addedAccounts = newAccountIds.filter(
        (id) => !this.currentZoomAccounts.includes(id),
      )
      const removedAccounts = this.currentZoomAccounts.filter(
        (id) => !newAccountIds.includes(id),
      )

      // Update our tracking
      this.currentZoomAccounts = newAccountIds

      // Create capacity update event
      const capacityEvent: CapacityUpdateEvent = {
        type: 'capacity_updated',
        timestamp: new Date(),
        previousCapacity: this.currentZoomAccounts.length * 2, // 2 meetings per account
        newCapacity: newAccountIds.length * 2,
        addedAccounts,
        removedAccounts,
        totalAccounts: newAccountIds.length,
      }

      // Emit capacity update event
      this.emit('capacity_updated', capacityEvent)

      // Update conflict detection engine
      enhancedConflictDetectionClient.updateCapacityLimits(updatedAccounts)

      // Create settings change event
      const settingsEvent: SettingsChangeEvent = {
        type: 'zoom_accounts_changed',
        timestamp: new Date(),
        changeType,
        affectedAccountId: accountId,
        newAccountData: accountData,
        totalAccounts: newAccountIds.length,
      }

      this.emit('settings_changed', settingsEvent)

      console.log(`Zoom account ${changeType}: ${accountId}`, {
        totalAccounts: newAccountIds.length,
        addedAccounts,
        removedAccounts,
      })
    } catch (error) {
      console.error('Error handling Zoom account change:', error)
    }
  }

  /**
   * Subscribe to settings changes
   */
  subscribeToSettingsChanges(
    callback: (event: SettingsChangeEvent) => void,
  ): string {
    const subscriptionId = `settings-${Date.now()}-${Math.random()}`
    this.on('settings_changed', callback)
    return subscriptionId
  }

  /**
   * Subscribe to capacity updates
   */
  subscribeToCapacityUpdates(
    callback: (event: CapacityUpdateEvent) => void,
  ): string {
    const subscriptionId = `capacity-${Date.now()}-${Math.random()}`
    this.on('capacity_updated', callback)
    return subscriptionId
  }

  /**
   * Subscribe to conflict notifications
   */
  subscribeToConflictNotifications(
    callback: (notification: ConflictNotification) => void,
  ): string {
    const subscriptionId = `notification-${Date.now()}-${Math.random()}`
    this.on('conflict_notification', callback)
    return subscriptionId
  }

  /**
   * Get current notification queue
   */
  getNotificationQueue(): ConflictNotification[] {
    return [...this.notificationQueue]
  }

  /**
   * Clear notification queue
   */
  clearNotificationQueue(): void {
    this.notificationQueue = []
    this.emit('notification_queue_cleared')
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): void {
    const notification = this.notificationQueue.find(
      (n) => n.id === notificationId,
    )
    if (notification) {
      notification.isRead = true
      this.emit('notification_updated', notification)
    }
  }

  /**
   * Force refresh of all cached data
   */
  async forceRefresh(): Promise<void> {
    try {
      // Clear all caches
      zoomAccountServiceClient.clearCache()
      enhancedConflictDetectionClient.clearCache()

      // Re-initialize
      this.isInitialized = false
      await this.initialize()

      this.emit('force_refresh_completed')
    } catch (error) {
      console.error('Error during force refresh:', error)
    }
  }

  /**
   * Get current system capacity status
   */
  async getCapacityStatus(): Promise<{
    totalAccounts: number
    totalCapacity: number
    currentUsage: number
    availableSlots: number
    utilizationPercentage: number
  }> {
    try {
      const response = await fetch('/api/capacity-status')
      if (response.ok) {
        return await response.json()
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      console.error('Error getting capacity status:', error)
      return {
        totalAccounts: 0,
        totalCapacity: 0,
        currentUsage: 0,
        availableSlots: 0,
        utilizationPercentage: 0,
      }
    }
  }

  /**
   * Start periodic monitoring for changes
   */
  private startPeriodicMonitoring(): void {
    // Check for changes every 30 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        const currentAccounts =
          await zoomAccountServiceClient.getAvailableAccounts()
        const currentAccountIds = currentAccounts.map((account) => account.id)

        // Check if accounts have changed
        const accountsChanged =
          currentAccountIds.length !== this.currentZoomAccounts.length ||
          !currentAccountIds.every((id) =>
            this.currentZoomAccounts.includes(id),
          )

        if (accountsChanged) {
          console.log(
            'Detected Zoom account changes during periodic monitoring',
          )
          await this.handleZoomAccountChange(
            ZoomAccountChangeType.UPDATED,
            'system-detected',
            null,
          )
        }
      } catch (error) {
        console.error('Error during periodic monitoring:', error)
      }
    }, 30000) // 30 seconds
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }

    this.removeAllListeners()
    this.notificationQueue = []
    this.isInitialized = false
  }
}

// Export singleton instance for client-side use
export const settingsIntegrationServiceClient =
  SettingsIntegrationServiceClient.getInstance()
