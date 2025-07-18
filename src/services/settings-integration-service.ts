/**
 * Settings Integration Service
 *
 * Handles real-time integration between settings changes and conflict detection.
 * Manages capacity recalculation and notification system for newly created conflicts.
 */

import { EventEmitter } from 'events'
import { zoomAccountServiceClient } from './zoom-account-service-client'
import { enhancedConflictDetection } from './enhanced-conflict-detection'
import {
  MeetingFormData,
  SettingsIntegrationService,
  SettingsChangeEvent,
  ConflictNotification,
  CapacityUpdateEvent,
  ZoomAccountChangeType,
  MeetingType,
} from '@/types/conflict-detection'

export class SettingsIntegrationServiceImpl
  extends EventEmitter
  implements SettingsIntegrationService
{
  private static instance: SettingsIntegrationServiceImpl
  private isInitialized = false
  private currentZoomAccounts: string[] = []
  private notificationQueue: ConflictNotification[] = []
  private readonly MAX_NOTIFICATION_QUEUE = 50

  private constructor() {
    super()
    this.setMaxListeners(100) // Allow many listeners for real-time updates
  }

  public static getInstance(): SettingsIntegrationServiceImpl {
    if (!SettingsIntegrationServiceImpl.instance) {
      SettingsIntegrationServiceImpl.instance =
        new SettingsIntegrationServiceImpl()
    }
    return SettingsIntegrationServiceImpl.instance
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
        `Settings Integration Service initialized with ${accounts.length} Zoom accounts`,
      )
    } catch (error) {
      console.error('Failed to initialize Settings Integration Service:', error)

      // Initialize with empty state instead of throwing error
      this.currentZoomAccounts = []
      this.isInitialized = true
      console.log(
        'Settings Integration Service initialized with no Zoom accounts (graceful degradation)',
      )
    }
  }

  /**
   * Handle Zoom account changes (add/remove/update)
   */
  async handleZoomAccountChange(
    changeType: ZoomAccountChangeType,
    accountId: string,
    accountData?: Record<string, unknown>,
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
      enhancedConflictDetection.updateCapacityLimits(updatedAccounts)

      // Check for newly created conflicts
      await this.checkForNewConflicts(capacityEvent)

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
      throw error
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
      enhancedConflictDetection.clearCache()

      // Re-initialize
      this.isInitialized = false
      await this.initialize()

      this.emit('force_refresh_completed')
    } catch (error) {
      console.error('Error during force refresh:', error)
      throw error
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
      const accounts = await zoomAccountServiceClient.getAvailableAccounts()
      const loadInfo = await zoomAccountServiceClient.getAccountLoadBalancing()

      const totalCapacity = accounts.length * 2 // 2 meetings per account
      const currentUsage = loadInfo.reduce(
        (sum, info) => sum + info.currentLoad,
        0,
      )
      const availableSlots = totalCapacity - currentUsage
      const utilizationPercentage =
        totalCapacity > 0 ? (currentUsage / totalCapacity) * 100 : 0

      return {
        totalAccounts: accounts.length,
        totalCapacity,
        currentUsage,
        availableSlots,
        utilizationPercentage,
      }
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
    setInterval(async () => {
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
            undefined,
          )
        }
      } catch (error) {
        console.error('Error during periodic monitoring:', error)
      }
    }, 30000) // 30 seconds
  }

  /**
   * Check for newly created conflicts after capacity changes
   */
  private async checkForNewConflicts(
    capacityEvent: CapacityUpdateEvent,
  ): Promise<void> {
    try {
      // If capacity was reduced, we need to check existing meetings for new conflicts
      if (capacityEvent.newCapacity < capacityEvent.previousCapacity) {
        // Get all upcoming Zoom meetings
        const upcomingMeetings = await this.getUpcomingZoomMeetings()

        for (const meeting of upcomingMeetings) {
          // Re-validate each meeting with new capacity
          const meetingFormData = this.convertMeetingToFormData(meeting)
          const conflictResult =
            await enhancedConflictDetection.validateMeeting(meetingFormData)

          // If new conflicts are found, create notifications
          if (conflictResult.conflicts.length > 0) {
            const notification: ConflictNotification = {
              id: `conflict-${meeting.id}-${Date.now()}`,
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              conflicts: conflictResult.conflicts,
              createdAt: new Date(),
              isRead: false,
              severity: conflictResult.conflicts.some(
                (c) => c.severity === 'error',
              )
                ? 'error'
                : 'warning',
              message: `Meeting "${meeting.title}" now has conflicts due to Zoom account changes`,
            }

            this.addNotification(notification)
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new conflicts:', error)
    }
  }

  /**
   * Add notification to queue
   */
  private addNotification(notification: ConflictNotification): void {
    // Add to beginning of queue
    this.notificationQueue.unshift(notification)

    // Limit queue size
    if (this.notificationQueue.length > this.MAX_NOTIFICATION_QUEUE) {
      this.notificationQueue = this.notificationQueue.slice(
        0,
        this.MAX_NOTIFICATION_QUEUE,
      )
    }

    // Emit notification event
    this.emit('conflict_notification', notification)
  }

  /**
   * Get upcoming Zoom meetings (next 30 days)
   */
  private async getUpcomingZoomMeetings(): Promise<
    {
      id: string
      title: string
      date: Date
      duration: number
      participants: string
      meetingType: string
      isZoomMeeting: boolean
      meetingRoomId: string | null
      description: string | null
      zoomPassword: string | null
    }[]
  > {
    try {
      // Use Prisma directly since this is a server-side service
      const prisma = (await import('@/lib/prisma')).default
      const now = new Date()
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      )

      const meetings = await prisma.meeting.findMany({
        where: {
          deletedAt: null,
          isZoomMeeting: true,
          date: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
        select: {
          id: true,
          title: true,
          date: true,
          duration: true,
          participants: true,
          meetingType: true,
          isZoomMeeting: true,
          meetingRoomId: true,
          description: true,
          zoomPassword: true,
        },
      })

      return meetings
    } catch (error) {
      console.error('Error fetching upcoming Zoom meetings:', error)
      return []
    }
  }

  /**
   * Convert meeting data to MeetingFormData format
   */
  private convertMeetingToFormData(meeting: {
    title: string
    date: Date
    duration: number
    meetingType: string
    isZoomMeeting: boolean
    meetingRoomId: string | null
    participants: string | string[]
    description: string | null
    zoomPassword: string | null
  }): MeetingFormData {
    return {
      title: meeting.title,
      date: new Date(meeting.date),
      time: new Date(meeting.date).toTimeString().slice(0, 5),
      duration: meeting.duration,
      meetingType: (meeting.meetingType as MeetingType) || MeetingType.HYBRID,
      isZoomMeeting: meeting.isZoomMeeting,
      meetingRoomId: meeting.meetingRoomId ?? undefined,
      participants: Array.isArray(meeting.participants)
        ? meeting.participants
        : meeting.participants?.split(',').map((p: string) => p.trim()) || [],
      description: meeting.description ?? undefined,
      zoomPassword: meeting.zoomPassword ?? undefined,
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners()
    this.notificationQueue = []
    this.isInitialized = false
  }
}

// Export singleton instance
export const settingsIntegrationService =
  SettingsIntegrationServiceImpl.getInstance()
