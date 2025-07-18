/**
 * Zoom Capacity Management Tests
 *
 * Comprehensive tests for Zoom account capacity management including:
 * - Load balancing algorithms
 * - Capacity calculation edge cases
 * - Account failover scenarios
 * - Performance optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { ZoomAccountServiceImpl } from '../zoom-account-service'
import { ConflictDetectionError } from '@/types/conflict-detection'
import prisma from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    zoomCredentials: {
      findMany: vi.fn(),
    },
    meeting: {
      findMany: vi.fn(),
    },
  },
}))

const mockPrisma = prisma as unknown as {
  zoomCredentials: { findMany: Mock }
  meeting: { findMany: Mock }
}

describe('Zoom Capacity Management', () => {
  let service: ZoomAccountServiceImpl

  beforeEach(() => {
    service = ZoomAccountServiceImpl.getInstance()
    service.clearCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Load Balancing Algorithms', () => {
    it('should distribute load evenly across accounts', async () => {
      // Setup 3 accounts with different current loads
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
        {
          id: 'zoom-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: [],
        },
        {
          id: 'zoom-3',
          accountId: 'acc-3',
          clientId: 'client-3',
          meetings: [],
        },
      ])

      // Mock different load levels
      mockPrisma.meeting.findMany
        .mockResolvedValueOnce([]) // zoom-1: 0 meetings
        .mockResolvedValueOnce([
          { id: 'meeting-1', zoomCredentialId: 'zoom-2' },
        ]) // zoom-2: 1 meeting
        .mockResolvedValueOnce([
          { id: 'meeting-2', zoomCredentialId: 'zoom-3' },
          { id: 'meeting-3', zoomCredentialId: 'zoom-3' },
        ]) // zoom-3: 2 meetings (at capacity)

      const loadInfo = await service.getAccountLoadBalancing()

      expect(loadInfo).toHaveLength(3)

      // Should be sorted by utilization (ascending)
      expect(loadInfo[0].utilizationPercentage).toBe(0) // zoom-1
      expect(loadInfo[1].utilizationPercentage).toBe(50) // zoom-2
      expect(loadInfo[2].utilizationPercentage).toBe(100) // zoom-3

      // Least loaded account should be first
      expect(loadInfo[0].currentLoad).toBe(0)
      expect(loadInfo[0].maxCapacity).toBe(2)
    })

    it('should select least loaded account for new meetings', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-low-load',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
        {
          id: 'zoom-high-load',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: [],
        },
      ])

      // Mock different loads
      mockPrisma.meeting.findMany
        .mockResolvedValueOnce([]) // zoom-low-load: 0 meetings
        .mockResolvedValueOnce([
          { id: 'meeting-1', zoomCredentialId: 'zoom-high-load' },
        ]) // zoom-high-load: 1 meeting

      const leastLoadedAccount = await service.getLeastLoadedAccount()

      expect(leastLoadedAccount).toBeDefined()
      expect(leastLoadedAccount?.id).toBe('zoom-low-load')
    })

    it('should handle equal load distribution', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
        {
          id: 'zoom-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: [],
        },
      ])

      // Both accounts have equal load
      mockPrisma.meeting.findMany
        .mockResolvedValueOnce([
          { id: 'meeting-1', zoomCredentialId: 'zoom-1' },
        ])
        .mockResolvedValueOnce([
          { id: 'meeting-2', zoomCredentialId: 'zoom-2' },
        ])

      const loadInfo = await service.getAccountLoadBalancing()

      expect(loadInfo).toHaveLength(2)
      expect(loadInfo[0].utilizationPercentage).toBe(50)
      expect(loadInfo[1].utilizationPercentage).toBe(50)
    })
  })

  describe('Capacity Calculation Edge Cases', () => {
    it('should handle overlapping meeting time calculations', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // Mock meetings with various overlap scenarios
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Exact Overlap',
          date: new Date('2024-01-15T10:00:00Z'),
          duration: 60, // 10:00-11:00 (exact overlap)
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
        {
          id: 'meeting-2',
          title: 'Partial Overlap Start',
          date: new Date('2024-01-15T09:30:00Z'),
          duration: 60, // 09:30-10:30 (overlaps start)
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
        {
          id: 'meeting-3',
          title: 'Partial Overlap End',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60, // 10:30-11:30 (overlaps end)
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
        {
          id: 'meeting-4',
          title: 'Contains Meeting',
          date: new Date('2024-01-15T09:00:00Z'),
          duration: 180, // 09:00-12:00 (contains our meeting)
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
        {
          id: 'meeting-5',
          title: 'No Overlap',
          date: new Date('2024-01-15T12:00:00Z'),
          duration: 60, // 12:00-13:00 (no overlap)
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const result = await service.checkConcurrentMeetingCapacity(
        startTime,
        endTime,
      )

      // Should count 4 overlapping meetings (all except meeting-5)
      expect(result.currentTotalUsage).toBe(4)
      expect(result.hasAvailableAccount).toBe(false) // Exceeds capacity of 2
      expect(result.conflictingMeetings).toHaveLength(4)
    })

    it('should handle timezone edge cases', async () => {
      const startTime = new Date('2024-01-15T23:30:00Z') // Late evening UTC
      const endTime = new Date('2024-01-16T00:30:00Z') // Early morning next day UTC

      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-cross-midnight',
          title: 'Cross Midnight Meeting',
          date: new Date('2024-01-15T23:45:00Z'),
          duration: 60, // 23:45-00:45 (crosses midnight)
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const result = await service.checkConcurrentMeetingCapacity(
        startTime,
        endTime,
      )

      expect(result.currentTotalUsage).toBe(1)
      expect(result.conflictingMeetings).toHaveLength(1)
    })

    it('should handle very short meeting durations', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T10:01:00Z') // 1 minute meeting

      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'short-meeting',
          title: 'Short Meeting',
          date: new Date('2024-01-15T10:00:30Z'),
          duration: 1, // 1 minute meeting
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const result = await service.checkConcurrentMeetingCapacity(
        startTime,
        endTime,
      )

      expect(result.currentTotalUsage).toBe(1)
      expect(result.hasAvailableAccount).toBe(true) // Still has capacity
    })

    it('should handle very long meeting durations', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'all-day-meeting',
          title: 'All Day Meeting',
          date: new Date('2024-01-15T08:00:00Z'),
          duration: 480, // 8 hours (8:00-16:00)
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const result = await service.checkConcurrentMeetingCapacity(
        startTime,
        endTime,
      )

      expect(result.currentTotalUsage).toBe(1)
      expect(result.conflictingMeetings[0].title).toBe('All Day Meeting')
    })
  })

  describe('Account Failover Scenarios', () => {
    it('should handle account becoming unavailable', async () => {
      // Initially have 2 accounts
      mockPrisma.zoomCredentials.findMany.mockResolvedValueOnce([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
        {
          id: 'zoom-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: [],
        },
      ])

      const initialAccounts = await service.getAvailableAccounts()
      expect(initialAccounts).toHaveLength(2)

      // Simulate one account becoming unavailable
      mockPrisma.zoomCredentials.findMany.mockResolvedValueOnce([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // Clear cache to force refresh
      service.clearCache()

      const updatedAccounts = await service.getAvailableAccounts()
      expect(updatedAccounts).toHaveLength(1)
      expect(updatedAccounts[0].id).toBe('zoom-1')
    })

    it('should handle all accounts becoming unavailable', async () => {
      // Start with accounts
      mockPrisma.zoomCredentials.findMany.mockResolvedValueOnce([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      const initialAccounts = await service.getAvailableAccounts()
      expect(initialAccounts).toHaveLength(1)

      // All accounts become unavailable
      mockPrisma.zoomCredentials.findMany.mockResolvedValueOnce([])

      service.clearCache()

      const updatedAccounts = await service.getAvailableAccounts()
      expect(updatedAccounts).toHaveLength(0)

      // Capacity check should reflect no available accounts
      const capacityResult = await service.checkConcurrentMeetingCapacity(
        new Date(),
        new Date(),
      )

      expect(capacityResult.hasAvailableAccount).toBe(false)
      expect(capacityResult.totalAccounts).toBe(0)
      expect(capacityResult.totalMaxConcurrent).toBe(0)
    })

    it('should handle account recovery', async () => {
      // Start with no accounts
      mockPrisma.zoomCredentials.findMany.mockResolvedValueOnce([])

      const initialAccounts = await service.getAvailableAccounts()
      expect(initialAccounts).toHaveLength(0)

      // Account becomes available
      mockPrisma.zoomCredentials.findMany.mockResolvedValueOnce([
        {
          id: 'zoom-recovered',
          accountId: 'acc-recovered',
          clientId: 'client-recovered',
          meetings: [],
        },
      ])

      service.clearCache()

      const recoveredAccounts = await service.getAvailableAccounts()
      expect(recoveredAccounts).toHaveLength(1)
      expect(recoveredAccounts[0].id).toBe('zoom-recovered')
    })
  })

  describe('Performance Optimization', () => {
    it('should cache account data efficiently', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // First call should hit database
      const start1 = Date.now()
      await service.getAvailableAccounts()
      const duration1 = Date.now() - start1

      expect(mockPrisma.zoomCredentials.findMany).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const start2 = Date.now()
      await service.getAvailableAccounts()
      const duration2 = Date.now() - start2

      expect(mockPrisma.zoomCredentials.findMany).toHaveBeenCalledTimes(1) // No additional calls
      expect(duration2).toBeLessThan(duration1) // Should be faster
    })

    it('should handle cache expiration', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // First call
      await service.getAvailableAccounts()
      expect(mockPrisma.zoomCredentials.findMany).toHaveBeenCalledTimes(1)

      // Check cache stats
      const stats = service.getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.lastUpdated).toBeInstanceOf(Date)
      expect(stats.isExpired).toBe(false)

      // Manually expire cache by clearing it
      service.clearCache()

      // Next call should hit database again
      await service.getAvailableAccounts()
      expect(mockPrisma.zoomCredentials.findMany).toHaveBeenCalledTimes(2)
    })

    it('should optimize concurrent meeting counting', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z')
      const endTime = new Date('2024-01-15T11:00:00Z')

      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60,
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      // Multiple calls for the same account should be efficient
      const count1 = await service.countConcurrentMeetings(
        'zoom-1',
        startTime,
        endTime,
      )
      const count2 = await service.countConcurrentMeetings(
        'zoom-1',
        startTime,
        endTime,
      )

      expect(count1).toBe(1)
      expect(count2).toBe(1)

      // Should have made database calls (no caching at this level)
      expect(mockPrisma.meeting.findMany).toHaveBeenCalledTimes(2)
    })
  })

  describe('Capacity Calculation Accuracy', () => {
    it('should accurately calculate total system capacity', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
        {
          id: 'zoom-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: [],
        },
        {
          id: 'zoom-3',
          accountId: 'acc-3',
          clientId: 'client-3',
          meetings: [],
        },
      ])

      mockPrisma.meeting.findMany.mockResolvedValue([])

      const result = await service.checkConcurrentMeetingCapacity(
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
      )

      expect(result.totalAccounts).toBe(3)
      expect(result.totalMaxConcurrent).toBe(6) // 3 accounts × 2 meetings each
      expect(result.currentTotalUsage).toBe(0)
      expect(result.availableSlots).toBe(6)
      expect(result.hasAvailableAccount).toBe(true)
    })

    it('should handle partial capacity utilization', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
        {
          id: 'zoom-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: [],
        },
      ])

      // One account has 1 meeting, other has none
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60,
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const result = await service.checkConcurrentMeetingCapacity(
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
      )

      expect(result.totalAccounts).toBe(2)
      expect(result.totalMaxConcurrent).toBe(4)
      expect(result.currentTotalUsage).toBe(1)
      expect(result.availableSlots).toBe(3)
      expect(result.hasAvailableAccount).toBe(true)
    })

    it('should handle exact capacity limits', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // Exactly at capacity (2 meetings)
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60,
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
        {
          id: 'meeting-2',
          date: new Date('2024-01-15T10:15:00Z'),
          duration: 90,
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      const result = await service.checkConcurrentMeetingCapacity(
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
      )

      expect(result.totalAccounts).toBe(1)
      expect(result.totalMaxConcurrent).toBe(2)
      expect(result.currentTotalUsage).toBe(2)
      expect(result.availableSlots).toBe(0)
      expect(result.hasAvailableAccount).toBe(false)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.zoomCredentials.findMany.mockRejectedValue(
        new Error('Connection timeout'),
      )

      await expect(service.getAvailableAccounts()).rejects.toThrow(
        ConflictDetectionError,
      )
    })

    it('should handle malformed meeting data', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      // Mock malformed meeting data
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'malformed-meeting',
          date: null, // Invalid date
          duration: -10, // Invalid duration
          zoomCredentialId: 'zoom-1',
          zoomCredential: { id: 'zoom-1' },
        },
      ])

      // Should handle gracefully without crashing
      const result = await service.checkConcurrentMeetingCapacity(
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
      )

      expect(result).toBeDefined()
      expect(result.totalAccounts).toBe(1)
    })

    it('should handle empty meeting arrays', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'zoom-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: [],
        },
      ])

      mockPrisma.meeting.findMany.mockResolvedValue([])

      const result = await service.checkConcurrentMeetingCapacity(
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
      )

      expect(result.currentTotalUsage).toBe(0)
      expect(result.conflictingMeetings).toHaveLength(0)
      expect(result.hasAvailableAccount).toBe(true)
    })

    it('should handle null/undefined zoom credentials', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([])

      const result = await service.checkConcurrentMeetingCapacity(
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
      )

      expect(result.totalAccounts).toBe(0)
      expect(result.totalMaxConcurrent).toBe(0)
      expect(result.hasAvailableAccount).toBe(false)
      expect(result.suggestedAccount).toBeUndefined()
    })
  })
})
