/**
 * Settings Integration Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { settingsIntegrationService } from '../settings-integration-service'
import { ZoomAccountChangeType } from '@/types/conflict-detection'

// Mock dependencies
vi.mock('../zoom-account-service', () => ({
  zoomAccountService: {
    getAvailableAccounts: vi.fn().mockResolvedValue([
      {
        id: 'account-1',
        email: 'test@example.com',
        isActive: true,
        maxConcurrentMeetings: 2,
        maxParticipants: 1000,
        currentActiveMeetings: 0,
        scheduledMeetings: []
      }
    ]),
    clearCache: vi.fn(),
    getAccountLoadBalancing: vi.fn().mockResolvedValue([
      {
        accountId: 'account-1',
        currentLoad: 0,
        maxCapacity: 2,
        utilizationPercentage: 0
      }
    ])
  }
}))

vi.mock('../enhanced-conflict-detection', () => ({
  enhancedConflictDetection: {
    updateCapacityLimits: vi.fn(),
    clearCache: vi.fn(),
    validateMeeting: vi.fn().mockResolvedValue({
      conflicts: [],
      canSubmit: true,
      suggestions: []
    })
  }
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    meeting: {
      findMany: vi.fn().mockResolvedValue([])
    }
  }
}))

describe('SettingsIntegrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    settingsIntegrationService.destroy()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(settingsIntegrationService.initialize()).resolves.not.toThrow()
    })

    it('should not initialize twice', async () => {
      await settingsIntegrationService.initialize()
      await expect(settingsIntegrationService.initialize()).resolves.not.toThrow()
    })
  })

  describe('Zoom account changes', () => {
    beforeEach(async () => {
      await settingsIntegrationService.initialize()
    })

    it('should handle account addition', async () => {
      const eventPromise = new Promise((resolve) => {
        settingsIntegrationService.subscribeToCapacityUpdates(resolve)
      })

      await settingsIntegrationService.handleZoomAccountChange(
        ZoomAccountChangeType.ADDED,
        'new-account-id',
        { clientId: 'test-client', accountId: 'test-account' }
      )

      const event = await eventPromise
      expect(event).toMatchObject({
        type: 'capacity_updated',
        totalAccounts: expect.any(Number)
      })
    })

    it('should handle account removal', async () => {
      const eventPromise = new Promise((resolve) => {
        settingsIntegrationService.subscribeToCapacityUpdates(resolve)
      })

      await settingsIntegrationService.handleZoomAccountChange(
        ZoomAccountChangeType.REMOVED,
        'removed-account-id'
      )

      const event = await eventPromise
      expect(event).toMatchObject({
        type: 'capacity_updated',
        totalAccounts: expect.any(Number)
      })
    })
  })

  describe('capacity status', () => {
    beforeEach(async () => {
      await settingsIntegrationService.initialize()
    })

    it('should return capacity status', async () => {
      const status = await settingsIntegrationService.getCapacityStatus()
      
      expect(status).toMatchObject({
        totalAccounts: expect.any(Number),
        totalCapacity: expect.any(Number),
        currentUsage: expect.any(Number),
        availableSlots: expect.any(Number),
        utilizationPercentage: expect.any(Number)
      })
    })

    it('should handle errors gracefully', async () => {
      const { zoomAccountService } = await import('../zoom-account-service')
      vi.mocked(zoomAccountService.getAvailableAccounts).mockRejectedValueOnce(new Error('Test error'))

      const status = await settingsIntegrationService.getCapacityStatus()
      
      expect(status).toEqual({
        totalAccounts: 0,
        totalCapacity: 0,
        currentUsage: 0,
        availableSlots: 0,
        utilizationPercentage: 0
      })
    })
  })

  describe('notifications', () => {
    beforeEach(async () => {
      await settingsIntegrationService.initialize()
    })

    it('should manage notification queue', () => {
      const initialQueue = settingsIntegrationService.getNotificationQueue()
      expect(initialQueue).toEqual([])

      settingsIntegrationService.clearNotificationQueue()
      const clearedQueue = settingsIntegrationService.getNotificationQueue()
      expect(clearedQueue).toEqual([])
    })

    it('should mark notifications as read', () => {
      // This test would need a way to add notifications to the queue
      // For now, we just test that the method doesn't throw
      expect(() => {
        settingsIntegrationService.markNotificationAsRead('test-id')
      }).not.toThrow()
    })
  })

  describe('force refresh', () => {
    beforeEach(async () => {
      await settingsIntegrationService.initialize()
    })

    it('should force refresh successfully', async () => {
      await expect(settingsIntegrationService.forceRefresh()).resolves.not.toThrow()
    })
  })
})