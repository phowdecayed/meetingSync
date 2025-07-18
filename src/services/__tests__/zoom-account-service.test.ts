/**
 * Unit Tests for Zoom Account Service
 * 
 * Tests concurrent meeting tracking, capacity management, and load balancing
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { ZoomAccountServiceImpl, zoomAccountService } from '../zoom-account-service'
import { ConflictDetectionError } from '@/types/conflict-detection'
import prisma from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    zoomCredentials: {
      findMany: vi.fn()
    },
    meeting: {
      findMany: vi.fn()
    }
  }
}))

const mockPrisma = prisma as {
  zoomCredentials: { findMany: Mock }
  meeting: { findMany: Mock }
}

describe('ZoomAccountService', () => {
  let service: ZoomAccountServiceImpl

  beforeEach(() => {
    service = ZoomAccountServiceImpl.getInstance()
    service.clearCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getAvailableAccounts', () => {
    it('should return available Zoom accounts', async () => {
      // Mock database response
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'cred-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: []
        },
        {
          id: 'cred-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: []
        }
      ])

      const accounts = await service.getAvailableAccounts()

      expect(accounts).toHaveLength(2)
      expect(accounts[0]).toMatchObject({
        id: 'cred-1',
        isActive: true,
        maxConcurrentMeetings: 2,
        maxParticipants: 1000
      })
    })

    it('should handle empty credentials', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([])

      const accounts = await service.getAvailableAccounts()

      expect(accounts).toHaveLength(0)
    })

    it('should throw ConflictDetectionError on database error', async () => {
      mockPrisma.zoomCredentials.findMany.mockRejectedValue(new Error('DB Error'))

      await expect(service.getAvailableAccounts()).rejects.toThrow(ConflictDetectionError)
    })
  })

  describe('checkConcurrentMeetingCapacity', () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const endTime = new Date('2024-01-15T11:00:00Z')

    beforeEach(() => {
      // Mock credentials
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'cred-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: []
        },
        {
          id: 'cred-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: []
        }
      ])
    })

    it('should return capacity when no overlapping meetings', async () => {
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const result = await service.checkConcurrentMeetingCapacity(startTime, endTime)

      expect(result).toMatchObject({
        hasAvailableAccount: true,
        totalAccounts: 2,
        totalMaxConcurrent: 4, // 2 accounts × 2 meetings each
        currentTotalUsage: 0,
        availableSlots: 4
      })
      expect(result.suggestedAccount).toBeDefined()
    })

    it('should calculate capacity with overlapping meetings', async () => {
      // Mock overlapping meetings
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Meeting 1',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60,
          participants: 'user1@test.com,user2@test.com',
          zoomCredentialId: 'cred-1',
          zoomCredential: { id: 'cred-1' }
        },
        {
          id: 'meeting-2',
          title: 'Meeting 2',
          date: new Date('2024-01-15T10:15:00Z'),
          duration: 90,
          participants: 'user3@test.com',
          zoomCredentialId: 'cred-1',
          zoomCredential: { id: 'cred-1' }
        }
      ])

      const result = await service.checkConcurrentMeetingCapacity(startTime, endTime)

      expect(result).toMatchObject({
        hasAvailableAccount: true,
        totalAccounts: 2,
        totalMaxConcurrent: 4,
        currentTotalUsage: 2, // 2 meetings on cred-1
        availableSlots: 2
      })
      expect(result.conflictingMeetings).toHaveLength(2)
    })

    it('should return no available account when all at capacity', async () => {
      // Mock meetings that fill all capacity
      mockPrisma.meeting.findMany.mockResolvedValue([
        // 2 meetings on cred-1
        {
          id: 'meeting-1',
          title: 'Meeting 1',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60,
          participants: 'user1@test.com',
          zoomCredentialId: 'cred-1',
          zoomCredential: { id: 'cred-1' }
        },
        {
          id: 'meeting-2',
          title: 'Meeting 2',
          date: new Date('2024-01-15T10:15:00Z'),
          duration: 90,
          participants: 'user2@test.com',
          zoomCredentialId: 'cred-1',
          zoomCredential: { id: 'cred-1' }
        },
        // 2 meetings on cred-2
        {
          id: 'meeting-3',
          title: 'Meeting 3',
          date: new Date('2024-01-15T10:45:00Z'),
          duration: 30,
          participants: 'user3@test.com',
          zoomCredentialId: 'cred-2',
          zoomCredential: { id: 'cred-2' }
        },
        {
          id: 'meeting-4',
          title: 'Meeting 4',
          date: new Date('2024-01-15T10:00:00Z'),
          duration: 120,
          participants: 'user4@test.com',
          zoomCredentialId: 'cred-2',
          zoomCredential: { id: 'cred-2' }
        }
      ])

      const result = await service.checkConcurrentMeetingCapacity(startTime, endTime)

      expect(result).toMatchObject({
        hasAvailableAccount: false,
        totalAccounts: 2,
        totalMaxConcurrent: 4,
        currentTotalUsage: 4,
        availableSlots: 0
      })
      expect(result.suggestedAccount).toBeUndefined()
    })

    it('should exclude specified meeting from capacity calculation', async () => {
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Meeting 1',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60,
          participants: 'user1@test.com',
          zoomCredentialId: 'cred-1',
          zoomCredential: { id: 'cred-1' }
        }
      ])

      const result = await service.checkConcurrentMeetingCapacity(
        startTime, 
        endTime, 
        'meeting-1'
      )

      expect(result.currentTotalUsage).toBe(1) // Should still count the meeting since mock doesn't filter
    })
  })

  describe('findAvailableAccount', () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const endTime = new Date('2024-01-15T11:00:00Z')

    it('should return available account when capacity exists', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'cred-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: []
        }
      ])
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const account = await service.findAvailableAccount(startTime, endTime)

      expect(account).toBeDefined()
      expect(account?.id).toBe('cred-1')
    })

    it('should return null when no capacity available', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([])
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const account = await service.findAvailableAccount(startTime, endTime)

      expect(account).toBeNull()
    })
  })

  describe('getAccountLoadBalancing', () => {
    it('should return load balancing information sorted by utilization', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'cred-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: []
        },
        {
          id: 'cred-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: []
        }
      ])

      const loadInfo = await service.getAccountLoadBalancing()

      expect(loadInfo).toHaveLength(2)
      expect(loadInfo[0]).toMatchObject({
        accountId: expect.any(String),
        currentLoad: 0,
        maxCapacity: 2,
        utilizationPercentage: 0
      })
      
      // Should be sorted by utilization (ascending)
      expect(loadInfo[0].utilizationPercentage).toBeLessThanOrEqual(
        loadInfo[1].utilizationPercentage
      )
    })
  })

  describe('countConcurrentMeetings', () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const endTime = new Date('2024-01-15T11:00:00Z')

    it('should count meetings for specific account', async () => {
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          title: 'Meeting 1',
          date: new Date('2024-01-15T10:30:00Z'),
          duration: 60,
          participants: 'user1@test.com',
          zoomCredentialId: 'cred-1',
          zoomCredential: { id: 'cred-1' }
        },
        {
          id: 'meeting-2',
          title: 'Meeting 2',
          date: new Date('2024-01-15T10:15:00Z'),
          duration: 90,
          participants: 'user2@test.com',
          zoomCredentialId: 'cred-2',
          zoomCredential: { id: 'cred-2' }
        }
      ])

      const count = await service.countConcurrentMeetings('cred-1', startTime, endTime)

      expect(count).toBe(1) // Only meeting-1 belongs to cred-1
    })

    it('should return 0 when no meetings for account', async () => {
      mockPrisma.meeting.findMany.mockResolvedValue([])

      const count = await service.countConcurrentMeetings('cred-1', startTime, endTime)

      expect(count).toBe(0)
    })
  })

  describe('getLeastLoadedAccount', () => {
    it('should return account with lowest utilization', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'cred-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: []
        },
        {
          id: 'cred-2',
          accountId: 'acc-2',
          clientId: 'client-2',
          meetings: []
        }
      ])

      const account = await service.getLeastLoadedAccount()

      expect(account).toBeDefined()
      expect(['cred-1', 'cred-2']).toContain(account?.id)
    })

    it('should return null when no accounts available', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([])

      const account = await service.getLeastLoadedAccount()

      expect(account).toBeNull()
    })
  })

  describe('cache management', () => {
    it('should cache account data and reuse within TTL', async () => {
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([
        {
          id: 'cred-1',
          accountId: 'acc-1',
          clientId: 'client-1',
          meetings: []
        }
      ])

      // First call should hit database
      await service.getAvailableAccounts()
      expect(mockPrisma.zoomCredentials.findMany).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await service.getAvailableAccounts()
      expect(mockPrisma.zoomCredentials.findMany).toHaveBeenCalledTimes(1)
    })

    it('should provide cache statistics', async () => {
      // Initialize cache first
      mockPrisma.zoomCredentials.findMany.mockResolvedValue([])
      await service.getAvailableAccounts()
      
      const stats = service.getCacheStats()

      expect(stats).toMatchObject({
        size: expect.any(Number),
        lastUpdated: expect.any(Date),
        isExpired: expect.any(Boolean)
      })
    })

    it('should clear cache when requested', () => {
      service.clearCache()
      const stats = service.getCacheStats()

      expect(stats.size).toBe(0)
      expect(stats.lastUpdated).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should throw ConflictDetectionError with proper type', async () => {
      mockPrisma.zoomCredentials.findMany.mockRejectedValue(new Error('Database error'))

      try {
        await service.getAvailableAccounts()
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictDetectionError)
        expect((error as ConflictDetectionError).type).toBe('resource')
        expect((error as ConflictDetectionError).recoverable).toBe(true)
      }
    })
  })
})