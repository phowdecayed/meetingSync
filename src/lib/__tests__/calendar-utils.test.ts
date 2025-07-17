// Tests for calendar utilities

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatMeetingTime,
  formatMeetingDate,
  formatMeetingId,
  calculateMeetingStatus,
  calculateMeetingDuration,
  formatDuration,
  enhanceMeeting,
  groupMeetingsByDate,
  filterMeetingsBySearch,
  getResponsiveBreakpoint,
  truncateText,
  getStatusBadgeVariant,
  getTypeBadgeVariant,
  formatRelativeTime,
  formatTimeRange,
  formatDateRangeHeader,
  getMeetingStatusDetails,
  getTimeRemainingText,
  getDateRangeForPeriod,
  isDateInRange,
  groupMeetingsByDateRange,
  sortMeetingsByStartTime,
  sortMeetingsByStatus,
  getMeetingColorClasses,
  calculateMeetingOverlap,
  findOverlappingMeetings,
} from '../calendar-utils'

describe('Calendar Utilities', () => {
  describe('Date formatting', () => {
    test('formatMeetingTime should format same day times correctly', () => {
      const start = '2024-01-15T09:00:00Z'
      const end = '2024-01-15T10:30:00Z'
      const result = formatMeetingTime(start, end)
      expect(result).toMatch(/\d{2}:\d{2} - \d{2}:\d{2}/)
    })

    test('formatMeetingId should format 11-digit IDs correctly', () => {
      const id = '12345678901'
      const result = formatMeetingId(id)
      expect(result).toBe('123 4567 8901')
    })

    test('formatMeetingId should return original for non-11-digit IDs', () => {
      const id = '123456'
      const result = formatMeetingId(id)
      expect(result).toBe('123456')
    })
  })

  describe('Meeting status calculation', () => {
    test('calculateMeetingStatus should return "Akan Datang" for future meetings', () => {
      const futureStart = new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      const futureEnd = new Date(Date.now() + 7200000).toISOString() // 2 hours from now
      const result = calculateMeetingStatus(futureStart, futureEnd)
      expect(result).toBe('Akan Datang')
    })

    test('calculateMeetingStatus should return "Selesai" for past meetings', () => {
      const pastStart = new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      const pastEnd = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      const result = calculateMeetingStatus(pastStart, pastEnd)
      expect(result).toBe('Selesai')
    })
  })

  describe('Duration calculation', () => {
    test('calculateMeetingDuration should return correct minutes', () => {
      const start = '2024-01-15T09:00:00Z'
      const end = '2024-01-15T10:30:00Z'
      const result = calculateMeetingDuration(start, end)
      expect(result).toBe(90)
    })

    test('formatDuration should format minutes correctly', () => {
      expect(formatDuration(30)).toBe('30 menit')
      expect(formatDuration(60)).toBe('1 jam')
      expect(formatDuration(90)).toBe('1 jam 30 menit')
      expect(formatDuration(120)).toBe('2 jam')
    })
  })

  describe('Meeting enhancement', () => {
    test('enhanceMeeting should add calculated fields', () => {
      const baseMeeting = {
        id: '1',
        title: 'Test Meeting',
        description: 'Test description',
        start: '2024-01-15T09:00:00Z',
        end: '2024-01-15T10:30:00Z',
        organizerName: 'John Doe',
        status: 'Akan Datang' as const,
        meetingType: 'internal' as const,
        meetingRoom: 'Room A',
      }

      const enhanced = enhanceMeeting(baseMeeting)

      expect(enhanced).toHaveProperty('duration')
      expect(enhanced).toHaveProperty('isToday')
      expect(enhanced).toHaveProperty('isOngoing')
      expect(enhanced.duration).toBe(90)
    })
  })

  describe('Meeting grouping', () => {
    test('groupMeetingsByDate should group meetings correctly', () => {
      const meetings = [
        {
          id: '1',
          title: 'Meeting 1',
          start: '2024-01-15T09:00:00Z',
          end: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          title: 'Meeting 2',
          start: '2024-01-15T11:00:00Z',
          end: '2024-01-15T12:00:00Z',
        },
        {
          id: '3',
          title: 'Meeting 3',
          start: '2024-01-16T09:00:00Z',
          end: '2024-01-16T10:00:00Z',
        },
      ] as any[]

      const grouped = groupMeetingsByDate(meetings)

      expect(Object.keys(grouped)).toHaveLength(2)
      expect(grouped['2024-01-15']).toHaveLength(2)
      expect(grouped['2024-01-16']).toHaveLength(1)
    })
  })

  describe('Meeting filtering', () => {
    test('filterMeetingsBySearch should filter by title', () => {
      const meetings = [
        { id: '1', title: 'Team Meeting', description: null },
        { id: '2', title: 'Client Call', description: null },
        { id: '3', title: 'Project Review', description: null },
      ] as any[]

      const filtered = filterMeetingsBySearch(meetings, 'team')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe('Team Meeting')
    })

    test('filterMeetingsBySearch should filter by description', () => {
      const meetings = [
        {
          id: '1',
          title: 'Meeting 1',
          description: 'Discuss project timeline',
        },
        { id: '2', title: 'Meeting 2', description: 'Review budget' },
        { id: '3', title: 'Meeting 3', description: 'Team building' },
      ] as any[]

      const filtered = filterMeetingsBySearch(meetings, 'budget')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].description).toBe('Review budget')
    })
  })

  describe('Responsive utilities', () => {
    test('getResponsiveBreakpoint should return correct breakpoint', () => {
      expect(getResponsiveBreakpoint(500)).toBe('mobile')
      expect(getResponsiveBreakpoint(800)).toBe('tablet')
      expect(getResponsiveBreakpoint(1200)).toBe('desktop')
    })
  })

  describe('Text utilities', () => {
    test('truncateText should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated'
      const result = truncateText(longText, 20)
      expect(result).toBe('This is a very long...')
    })

    test('truncateText should not truncate short text', () => {
      const shortText = 'Short text'
      const result = truncateText(shortText, 20)
      expect(result).toBe('Short text')
    })
  })

  describe('Badge variants', () => {
    test('getStatusBadgeVariant should return correct variants', () => {
      expect(getStatusBadgeVariant('Sedang Berlangsung')).toBe('default')
      expect(getStatusBadgeVariant('Akan Datang')).toBe('secondary')
      expect(getStatusBadgeVariant('Selesai')).toBe('outline')
    })

    test('getTypeBadgeVariant should return correct variants', () => {
      expect(getTypeBadgeVariant('internal')).toBe('destructive')
      expect(getTypeBadgeVariant('external')).toBe('secondary')
    })
  })

  describe('Enhanced date formatting', () => {
    beforeEach(() => {
      // Mock the current date to ensure consistent test results
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-07-17T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('formatTimeRange should format same day times correctly', () => {
      const start = '2024-07-17T09:00:00Z'
      const end = '2024-07-17T10:30:00Z'
      const result = formatTimeRange(start, end)
      expect(result).toMatch(/\d{2}:\d{2} - \d{2}:\d{2}/)
    })

    test('formatTimeRange should include date when requested', () => {
      const start = '2024-07-17T09:00:00Z'
      const end = '2024-07-17T10:30:00Z'
      const result = formatTimeRange(start, end, true)
      expect(result).toContain('16:00 - 17:30') // UTC+7 conversion
      expect(result).toMatch(/[A-Za-z]+, \d{2} [A-Za-z]+/)
    })

    test('formatDateRangeHeader should format single day correctly', () => {
      const start = new Date('2024-07-17')
      const end = new Date('2024-07-17')
      const result = formatDateRangeHeader(start, end)
      expect(result).toMatch(/[A-Za-z]+, \d{2} [A-Za-z]+ \d{4}/)
    })

    test('formatDateRangeHeader should format date range in same month correctly', () => {
      const start = new Date('2024-07-17')
      const end = new Date('2024-07-20')
      const result = formatDateRangeHeader(start, end)
      expect(result).toMatch(/\d{2} - \d{2} [A-Za-z]+ \d{4}/)
    })
  })

  describe('Enhanced meeting status utilities', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-07-17T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('getMeetingStatusDetails should return correct status for upcoming meeting', () => {
      const start = '2024-07-17T14:00:00Z' // 2 hours from now
      const end = '2024-07-17T15:00:00Z'
      const result = getMeetingStatusDetails(start, end)

      expect(result.status).toBe('Akan Datang')
      expect(result.isUrgent).toBe(false)
      expect(result.timeUntil).toContain('jam')
    })

    test('getMeetingStatusDetails should mark urgent for soon-to-start meetings', () => {
      const start = '2024-07-17T12:15:00Z' // 15 minutes from now
      const end = '2024-07-17T13:00:00Z'
      const result = getMeetingStatusDetails(start, end)

      expect(result.status).toBe('Akan Datang')
      expect(result.isUrgent).toBe(true)
    })

    test('getMeetingStatusDetails should return correct status for ongoing meeting', () => {
      const start = '2024-07-17T11:30:00Z' // Started 30 minutes ago
      const end = '2024-07-17T12:30:00Z' // Ends in 30 minutes
      const result = getMeetingStatusDetails(start, end)

      expect(result.status).toBe('Sedang Berlangsung')
      expect(result.timeUntil).toContain('menit')
    })

    test('getTimeRemainingText should format time correctly for different states', () => {
      // Upcoming meeting
      expect(
        getTimeRemainingText('2024-07-17T14:00:00Z', '2024-07-17T15:00:00Z'),
      ).toContain('Dimulai')

      // Ongoing meeting
      expect(
        getTimeRemainingText('2024-07-17T11:30:00Z', '2024-07-17T12:30:00Z'),
      ).toContain('Berakhir')

      // Completed meeting
      expect(
        getTimeRemainingText('2024-07-17T10:00:00Z', '2024-07-17T11:00:00Z'),
      ).toContain('yang lalu')
    })
  })

  describe('Date range utilities', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-07-17T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('getDateRangeForPeriod should return correct range for today', () => {
      const range = getDateRangeForPeriod('today')
      expect(range.start.getDate()).toBe(17)
      expect(range.end.getDate()).toBe(17)
      expect(range.start.getHours()).toBe(0)
      expect(range.end.getHours()).toBe(23)
    })

    test('getDateRangeForPeriod should return correct range for week', () => {
      const range = getDateRangeForPeriod('week')
      expect(range.start).toBeDefined()
      expect(range.end).toBeDefined()
      expect(range.end.getTime() - range.start.getTime()).toBeGreaterThan(
        6 * 24 * 60 * 60 * 1000,
      ) // At least 6 days
    })

    test('isDateInRange should correctly identify dates in range', () => {
      // Today
      expect(isDateInRange('2024-07-17T15:00:00Z', 'today')).toBe(true)
      expect(isDateInRange('2024-07-18T15:00:00Z', 'today')).toBe(false)

      // This week
      const thisWeekDate = new Date()
      thisWeekDate.setDate(thisWeekDate.getDate() + 2) // 2 days from now, should be this week
      expect(isDateInRange(thisWeekDate.toISOString(), 'week')).toBe(true)

      // This month
      expect(isDateInRange('2024-07-30T15:00:00Z', 'month')).toBe(true)
      expect(isDateInRange('2024-08-01T15:00:00Z', 'month')).toBe(false)
    })
  })

  describe('Meeting sorting and grouping', () => {
    test('sortMeetingsByStartTime should sort meetings chronologically', () => {
      const meetings = [
        { id: '1', start: '2024-07-17T14:00:00Z' },
        { id: '2', start: '2024-07-17T09:00:00Z' },
        { id: '3', start: '2024-07-17T12:00:00Z' },
      ] as any[]

      const sorted = sortMeetingsByStartTime(meetings)
      expect(sorted[0].id).toBe('2')
      expect(sorted[1].id).toBe('3')
      expect(sorted[2].id).toBe('1')
    })

    test('sortMeetingsByStatus should prioritize ongoing meetings', () => {
      const meetings = [
        { id: '1', status: 'Akan Datang', start: '2024-07-17T14:00:00Z' },
        {
          id: '2',
          status: 'Sedang Berlangsung',
          start: '2024-07-17T09:00:00Z',
        },
        { id: '3', status: 'Selesai', start: '2024-07-17T07:00:00Z' },
      ] as any[]

      const sorted = sortMeetingsByStatus(meetings)
      expect(sorted[0].id).toBe('2') // Ongoing first
      expect(sorted[1].id).toBe('1') // Upcoming second
      expect(sorted[2].id).toBe('3') // Completed last
    })
  })

  describe('Meeting overlap detection', () => {
    test('calculateMeetingOverlap should detect overlapping meetings', () => {
      const meeting1 = {
        start: '2024-07-17T10:00:00Z',
        end: '2024-07-17T11:30:00Z',
      } as any

      const meeting2 = {
        start: '2024-07-17T11:00:00Z',
        end: '2024-07-17T12:00:00Z',
      } as any

      const meeting3 = {
        start: '2024-07-17T12:00:00Z',
        end: '2024-07-17T13:00:00Z',
      } as any

      expect(calculateMeetingOverlap(meeting1, meeting2)).toBe(true)
      expect(calculateMeetingOverlap(meeting1, meeting3)).toBe(false)
      expect(calculateMeetingOverlap(meeting2, meeting3)).toBe(false)
    })

    test('findOverlappingMeetings should identify all overlaps', () => {
      const meetings = [
        { id: '1', start: '2024-07-17T10:00:00Z', end: '2024-07-17T11:30:00Z' },
        { id: '2', start: '2024-07-17T11:00:00Z', end: '2024-07-17T12:00:00Z' },
        { id: '3', start: '2024-07-17T12:00:00Z', end: '2024-07-17T13:00:00Z' },
        { id: '4', start: '2024-07-17T11:15:00Z', end: '2024-07-17T12:30:00Z' },
      ] as any[]

      const overlaps = findOverlappingMeetings(meetings)
      expect(Object.keys(overlaps)).toHaveLength(4) // 4 meetings have overlaps
      expect(overlaps['1']).toHaveLength(2) // Meeting 1 overlaps with 2 and 4
      expect(overlaps['2']).toHaveLength(2) // Meeting 2 overlaps with 1 and 4
      expect(overlaps['3']).toHaveLength(1) // Meeting 3 overlaps with 4
      expect(overlaps['4']).toHaveLength(3) // Meeting 4 overlaps with 1, 2, and 3
    })
  })

  describe('Meeting display utilities', () => {
    test('getMeetingColorClasses should return correct classes based on status', () => {
      const ongoingMeeting = { status: 'Sedang Berlangsung' } as any
      const upcomingMeeting = { status: 'Akan Datang' } as any
      const completedMeeting = { status: 'Selesai' } as any

      const ongoingClasses = getMeetingColorClasses(ongoingMeeting)
      const upcomingClasses = getMeetingColorClasses(upcomingMeeting)
      const completedClasses = getMeetingColorClasses(completedMeeting)

      expect(ongoingClasses.background).toContain('green')
      expect(upcomingClasses.background).toContain('blue')
      expect(completedClasses.background).toContain('gray')
    })
  })
})
