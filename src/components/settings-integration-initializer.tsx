'use client'

import { useEffect, useState } from 'react'
import { settingsIntegrationServiceClient } from '@/services/settings-integration-service-client'
import {
  ConflictNotification,
  CapacityUpdateEvent,
} from '@/types/conflict-detection'
import { useToast } from '@/hooks/use-toast'

/**
 * Settings Integration Initializer Component
 *
 * Initializes the settings integration service and handles real-time updates
 * for conflict notifications and capacity changes.
 */
export function SettingsIntegrationInitializer() {
  const { toast } = useToast()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let mounted = true

    const initializeService = async () => {
      try {
        // Initialize the settings integration service (client-side)
        await settingsIntegrationServiceClient.initialize()

        if (!mounted) return

        // Subscribe to conflict notifications
        settingsIntegrationServiceClient.subscribeToConflictNotifications(
          (notification) => {
            if (!mounted) return

            // Show toast notification for new conflicts
            toast({
              title:
                notification.severity === 'error'
                  ? 'Meeting Conflict'
                  : 'Meeting Warning',
              description: notification.message,
              variant:
                notification.severity === 'error' ? 'destructive' : 'default',
              duration: 8000, // Show for 8 seconds
            })
          },
        )

        // Subscribe to capacity updates
        settingsIntegrationServiceClient.subscribeToCapacityUpdates(
          (event: CapacityUpdateEvent) => {
            if (!mounted) return

            // Show toast for significant capacity changes
            if (
              event.addedAccounts.length > 0 ||
              event.removedAccounts.length > 0
            ) {
              const message =
                event.addedAccounts.length > 0
                  ? `${event.addedAccounts.length} Zoom account(s) added. Total capacity: ${event.newCapacity} meetings.`
                  : `${event.removedAccounts.length} Zoom account(s) removed. Total capacity: ${event.newCapacity} meetings.`

              toast({
                title: 'Zoom Capacity Updated',
                description: message,
                duration: 5000,
              })
            }
          },
        )

        setIsInitialized(true)
        console.log(
          'Settings Integration Service (Client) initialized successfully',
        )
      } catch (error) {
        console.error(
          'Failed to initialize Settings Integration Service (Client):',
          error,
        )

        // Set as initialized even if there was an error to prevent infinite retries
        setIsInitialized(true)

        if (mounted) {
          // Only show error toast in development or if it's a critical error
          if (process.env.NODE_ENV === 'development') {
            toast({
              title: 'Initialization Warning',
              description:
                'Settings integration initialized with limited functionality. Check console for details.',
              variant: 'default',
              duration: 5000,
            })
          }
        }
      }
    }

    initializeService()

    return () => {
      mounted = false
    }
  }, [toast])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInitialized) {
        settingsIntegrationServiceClient.destroy()
      }
    }
  }, [isInitialized])

  // This component doesn't render anything visible
  return null
}

/**
 * Hook to access conflict notifications
 */
export function useConflictNotifications() {
  const [notifications, setNotifications] = useState<ConflictNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/conflict-notifications')
        if (response.ok) {
          const data = await response.json()
          if (mounted) {
            setNotifications(data)
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchNotifications()

    // Subscribe to real-time updates
    settingsIntegrationServiceClient.subscribeToConflictNotifications(
      (notification) => {
        if (mounted) {
          setNotifications((prev) => [notification, ...prev])
        }
      },
    )

    return () => {
      mounted = false
    }
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/conflict-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mark_read',
          notificationId,
        }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const clearAll = async () => {
    try {
      const response = await fetch('/api/conflict-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clear_all',
        }),
      })

      if (response.ok) {
        setNotifications([])
      }
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  return {
    notifications,
    isLoading,
    markAsRead,
    clearAll,
  }
}

/**
 * Hook to access capacity status
 */
export function useCapacityStatus() {
  const [capacityStatus, setCapacityStatus] = useState({
    totalAccounts: 0,
    totalCapacity: 0,
    currentUsage: 0,
    availableSlots: 0,
    utilizationPercentage: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchCapacityStatus = async () => {
      try {
        const response = await fetch('/api/capacity-status')
        if (response.ok) {
          const data = await response.json()
          if (mounted) {
            setCapacityStatus(data)
          }
        }
      } catch (error) {
        console.error('Error fetching capacity status:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchCapacityStatus()

    // Subscribe to capacity updates
    settingsIntegrationServiceClient.subscribeToCapacityUpdates(() => {
      if (mounted) {
        // Refresh capacity status when updates occur
        fetchCapacityStatus()
      }
    })

    // Refresh every 60 seconds
    const interval = setInterval(fetchCapacityStatus, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const forceRefresh = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/capacity-status', {
        method: 'POST',
      })

      if (response.ok) {
        // Fetch updated status
        const statusResponse = await fetch('/api/capacity-status')
        if (statusResponse.ok) {
          const data = await statusResponse.json()
          setCapacityStatus(data)
        }
      }
    } catch (error) {
      console.error('Error forcing capacity refresh:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    capacityStatus,
    isLoading,
    forceRefresh,
  }
}
