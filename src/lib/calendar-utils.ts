// Utility functions for the public calendar layout system

import {
  format,
  isToday,
  isThisWeek,
  differenceInMinutes,
  parseISO,
  startOfDay,
  endOfDay,
  isSameDay,
  addDays,
  startOfWeek,
  endOfWeek,
  formatDistanceToNow,
  isThisMonth,
} from 'date-fns'
import { id } from 'date-fns/locale'
import type {
  PublicMeeting,
  MeetingStatus,
  ResponsiveBreakpoint,
  LayoutConfig,
  GroupingMode,
  ViewMode,
  DateRange,
} from '@/types/public-calendar'

/**
 * Date formatting utilities
 */
export const formatMeetingTime = (start: string, end: string): string => {
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (isSameDay(startDate, endDate)) {
    return `${format(startDate, 'HH:mm', { locale: id })} - ${format(endDate, 'HH:mm', { locale: id })}`
  }

  return `${format(startDate, 'dd/MM HH:mm', { locale: id })} - ${format(endDate, 'dd/MM HH:mm', { locale: id })}`
}

export const formatMeetingDate = (date: string): string => {
  const parsedDate = parseISO(date)

  if (isToday(parsedDate)) {
    return 'Hari Ini'
  }

  if (isThisWeek(parsedDate)) {
    return format(parsedDate, 'EEEE', { locale: id })
  }

  return format(parsedDate, 'EEEE, dd MMMM yyyy', { locale: id })
}

export const formatDateSection = (date: Date): string => {
  if (isToday(date)) {
    return `Hari Ini - ${format(date, 'dd MMMM yyyy', { locale: id })}`
  }

  if (isThisWeek(date)) {
    return format(date, 'EEEE, dd MMMM yyyy', { locale: id })
  }

  return format(date, 'EEEE, dd MMMM yyyy', { locale: id })
}

export const formatMeetingId = (id: string): string => {
  if (!id || id.length !== 11) return id
  return `${id.slice(0, 3)} ${id.slice(3, 7)} ${id.slice(7)}`
}

/**
 * Meeting status calculation utilities
 */
export const calculateMeetingStatus = (
  start: string,
  end: string,
): MeetingStatus => {
  const now = new Date()
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (now < startDate) {
    return 'Akan Datang'
  } else if (now >= startDate && now <= endDate) {
    return 'Sedang Berlangsung'
  } else {
    return 'Selesai'
  }
}

export const isMeetingOngoing = (start: string, end: string): boolean => {
  const now = new Date()
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  return now >= startDate && now <= endDate
}

export const isMeetingToday = (start: string): boolean => {
  const startDate = parseISO(start)
  return isToday(startDate)
}

export const getMeetingTimeUntilStart = (start: string): number => {
  const now = new Date()
  const startDate = parseISO(start)

  if (startDate <= now) return 0

  return differenceInMinutes(startDate, now)
}

/**
 * Duration calculation utilities
 */
export const calculateMeetingDuration = (
  start: string,
  end: string,
): number => {
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  return differenceInMinutes(endDate, startDate)
}

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} menit`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} jam`
  }

  return `${hours} jam ${remainingMinutes} menit`
}

/**
 * Meeting enhancement utilities
 */
export const enhanceMeeting = (
  meeting: Omit<PublicMeeting, 'duration' | 'isToday' | 'isOngoing'>,
): PublicMeeting => {
  const duration = calculateMeetingDuration(meeting.start, meeting.end)
  const isToday = isMeetingToday(meeting.start)
  const isOngoing = isMeetingOngoing(meeting.start, meeting.end)

  return {
    ...meeting,
    duration,
    isToday,
    isOngoing,
    status: calculateMeetingStatus(meeting.start, meeting.end),
  }
}

export const enhanceMeetings = (
  meetings: Omit<PublicMeeting, 'duration' | 'isToday' | 'isOngoing'>[],
): PublicMeeting[] => {
  return meetings.map(enhanceMeeting)
}

/**
 * Meeting grouping utilities
 */
export const groupMeetingsByDate = (
  meetings: PublicMeeting[],
): Record<string, PublicMeeting[]> => {
  return meetings.reduce(
    (groups, meeting) => {
      const dateKey = format(parseISO(meeting.start), 'yyyy-MM-dd')

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }

      groups[dateKey].push(meeting)
      return groups
    },
    {} as Record<string, PublicMeeting[]>,
  )
}

export const groupMeetingsByStatus = (
  meetings: PublicMeeting[],
): Record<MeetingStatus, PublicMeeting[]> => {
  return meetings.reduce(
    (groups, meeting) => {
      const status = meeting.status

      if (!groups[status]) {
        groups[status] = []
      }

      groups[status].push(meeting)
      return groups
    },
    {} as Record<MeetingStatus, PublicMeeting[]>,
  )
}

export const groupMeetingsByType = (
  meetings: PublicMeeting[],
): Record<string, PublicMeeting[]> => {
  return meetings.reduce(
    (groups, meeting) => {
      const type = meeting.meetingType

      if (!groups[type]) {
        groups[type] = []
      }

      groups[type].push(meeting)
      return groups
    },
    {} as Record<string, PublicMeeting[]>,
  )
}

/**
 * Meeting filtering utilities
 */
export const filterMeetingsBySearch = (
  meetings: PublicMeeting[],
  searchTerm: string,
): PublicMeeting[] => {
  if (!searchTerm.trim()) return meetings

  const term = searchTerm.toLowerCase()

  return meetings.filter(
    (meeting) =>
      (meeting.title && meeting.title.toLowerCase().includes(term)) ||
      (meeting.description &&
        meeting.description.toLowerCase().includes(term)) ||
      (meeting.organizerName &&
        meeting.organizerName.toLowerCase().includes(term)) ||
      (meeting.meetingRoom && meeting.meetingRoom.toLowerCase().includes(term)),
  )
}

export const filterMeetingsByDateRange = (
  meetings: PublicMeeting[],
  range: 'today' | 'week' | 'month',
): PublicMeeting[] => {
  const now = new Date()

  return meetings.filter((meeting) => {
    const meetingDate = parseISO(meeting.start)

    switch (range) {
      case 'today':
        return isSameDay(meetingDate, now)
      case 'week':
        return isThisWeek(meetingDate)
      case 'month':
        // For month, we'll include meetings within the current month
        return (
          meetingDate.getMonth() === now.getMonth() &&
          meetingDate.getFullYear() === now.getFullYear()
        )
      default:
        return true
    }
  })
}

/**
 * Responsive layout utilities
 */
export const getResponsiveBreakpoint = (
  width: number,
): ResponsiveBreakpoint => {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export const getGridColumns = (
  breakpoint: ResponsiveBreakpoint,
  config: LayoutConfig,
): number => {
  return config.columns[breakpoint]
}

export const calculateCardWidth = (
  containerWidth: number,
  columns: number,
  gap: number = 16,
): number => {
  const totalGap = (columns - 1) * gap
  return (containerWidth - totalGap) / columns
}

export const shouldShowCompactView = (
  breakpoint: ResponsiveBreakpoint,
): boolean => {
  return breakpoint === 'mobile'
}

export const getMaxDescriptionLength = (
  breakpoint: ResponsiveBreakpoint,
): number => {
  switch (breakpoint) {
    case 'mobile':
      return 80
    case 'tablet':
      return 120
    case 'desktop':
      return 200
    default:
      return 120
  }
}

/**
 * Default layout configuration
 */
export const defaultLayoutConfig: LayoutConfig = {
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  cardSize: {
    compact: false,
    showDescription: true,
    maxDescriptionLength: 120,
  },
  grouping: {
    enabled: true,
    by: 'date',
  },
}

/**
 * Utility to truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Utility to get meeting status badge variant
 */
export const getStatusBadgeVariant = (
  status: MeetingStatus,
): 'default' | 'secondary' | 'outline' => {
  switch (status) {
    case 'Sedang Berlangsung':
      return 'default'
    case 'Akan Datang':
      return 'secondary'
    case 'Selesai':
      return 'outline'
    default:
      return 'outline'
  }
}

/**
 * Utility to get meeting type badge variant
 */
export const getTypeBadgeVariant = (
  type: string,
): 'destructive' | 'secondary' => {
  return type === 'internal' ? 'destructive' : 'secondary'
}

/**
 * Enhanced date formatting utilities
 */
export const formatRelativeTime = (date: string): string => {
  const parsedDate = parseISO(date)
  return formatDistanceToNow(parsedDate, { addSuffix: true, locale: id })
}

export const formatTimeRange = (
  start: string,
  end: string,
  includeDate: boolean = false,
): string => {
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (isSameDay(startDate, endDate)) {
    const timeRange = `${format(startDate, 'HH:mm', { locale: id })} - ${format(endDate, 'HH:mm', { locale: id })}`
    if (includeDate) {
      return `${format(startDate, 'EEEE, dd MMM', { locale: id })} · ${timeRange}`
    }
    return timeRange
  }

  return `${format(startDate, 'dd MMM HH:mm', { locale: id })} - ${format(endDate, 'dd MMM HH:mm', { locale: id })}`
}

export const formatDateRangeHeader = (
  startDate: Date,
  endDate: Date,
): string => {
  if (isSameDay(startDate, endDate)) {
    return format(startDate, 'EEEE, dd MMMM yyyy', { locale: id })
  }

  if (startDate.getMonth() === endDate.getMonth()) {
    return `${format(startDate, 'dd')} - ${format(endDate, 'dd MMMM yyyy', { locale: id })}`
  }

  return `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM yyyy', { locale: id })}`
}

/**
 * Enhanced meeting status utilities
 */
export const getMeetingStatusDetails = (
  start: string,
  end: string,
): {
  status: MeetingStatus
  timeUntil: string
  isUrgent: boolean
} => {
  const now = new Date()
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (now < startDate) {
    const minutesUntil = differenceInMinutes(startDate, now)
    const isUrgent = minutesUntil <= 30 // Starting in 30 minutes or less

    return {
      status: 'Akan Datang',
      timeUntil: formatDistanceToNow(startDate, {
        addSuffix: true,
        locale: id,
      }),
      isUrgent,
    }
  } else if (now >= startDate && now <= endDate) {
    const minutesLeft = differenceInMinutes(endDate, now)
    const isUrgent = minutesLeft <= 15 // Ending in 15 minutes or less

    return {
      status: 'Sedang Berlangsung',
      timeUntil: formatDistanceToNow(endDate, { addSuffix: true, locale: id }),
      isUrgent,
    }
  } else {
    return {
      status: 'Selesai',
      timeUntil: formatDistanceToNow(endDate, { addSuffix: false, locale: id }),
      isUrgent: false,
    }
  }
}

export const getTimeRemainingText = (start: string, end: string): string => {
  const now = new Date()
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (now < startDate) {
    return `Dimulai ${formatDistanceToNow(startDate, { addSuffix: true, locale: id })}`
  } else if (now >= startDate && now <= endDate) {
    return `Berakhir ${formatDistanceToNow(endDate, { addSuffix: true, locale: id })}`
  } else {
    return `Berakhir ${formatDistanceToNow(endDate, { addSuffix: false, locale: id })} yang lalu`
  }
}

/**
 * Enhanced date range utilities
 */
export const getDateRangeForPeriod = (
  period: DateRange,
): { start: Date; end: Date } => {
  const now = new Date()

  switch (period) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      }
    case 'week':
      return {
        start: startOfWeek(now, { locale: id }),
        end: endOfWeek(now, { locale: id }),
      }
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      }
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(addDays(now, 7)),
      }
  }
}

export const isDateInRange = (date: string, range: DateRange): boolean => {
  const parsedDate = parseISO(date)

  switch (range) {
    case 'today':
      return isToday(parsedDate)
    case 'week':
      return isThisWeek(parsedDate, { locale: id })
    case 'month':
      return isThisMonth(parsedDate)
    default:
      return true
  }
}

/**
 * Enhanced meeting grouping utilities
 */
export const groupMeetingsByDateRange = (
  meetings: PublicMeeting[],
  range: DateRange,
): Record<string, PublicMeeting[]> => {
  // Filter meetings by date range first
  const filteredMeetings = meetings.filter((meeting) =>
    isDateInRange(meeting.start, range),
  )

  // Then group by date
  return groupMeetingsByDate(filteredMeetings)
}

export const groupMeetingsByCustomField = (
  meetings: PublicMeeting[],
  groupBy: GroupingMode,
): Record<string, PublicMeeting[]> => {
  switch (groupBy) {
    case 'date':
      return groupMeetingsByDate(meetings)
    case 'status':
      return groupMeetingsByStatus(meetings)
    case 'type':
      return groupMeetingsByType(meetings)
    default:
      return groupMeetingsByDate(meetings)
  }
}

/**
 * Enhanced meeting sorting utilities
 */
export const sortMeetingsByStartTime = (
  meetings: PublicMeeting[],
): PublicMeeting[] => {
  return [...meetings].sort((a, b) => {
    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })
}

export const sortMeetingsByStatus = (
  meetings: PublicMeeting[],
): PublicMeeting[] => {
  const statusPriority: Record<MeetingStatus, number> = {
    'Sedang Berlangsung': 1,
    'Akan Datang': 2,
    Selesai: 3,
  }

  return [...meetings].sort((a, b) => {
    const statusDiff = statusPriority[a.status] - statusPriority[b.status]
    if (statusDiff !== 0) return statusDiff

    // If same status, sort by start time
    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })
}

/**
 * Enhanced view mode utilities
 */
export const getOptimalViewMode = (
  breakpoint: ResponsiveBreakpoint,
  containerWidth: number,
): ViewMode => {
  if (breakpoint === 'mobile') return 'list'
  if (breakpoint === 'tablet' && containerWidth < 600) return 'compact'
  return 'grid'
}

/**
 * Enhanced meeting data utilities
 */
export const calculateMeetingOverlap = (
  meeting1: PublicMeeting,
  meeting2: PublicMeeting,
): boolean => {
  const start1 = parseISO(meeting1.start)
  const end1 = parseISO(meeting1.end)
  const start2 = parseISO(meeting2.start)
  const end2 = parseISO(meeting2.end)

  return (
    (start1 <= start2 && end1 > start2) || // meeting1 starts before meeting2 and ends during meeting2
    (start2 <= start1 && end2 > start1) || // meeting2 starts before meeting1 and ends during meeting1
    (start1 <= start2 && end1 >= end2) || // meeting1 completely contains meeting2
    (start2 <= start1 && end2 >= end1) // meeting2 completely contains meeting1
  )
}

export const findOverlappingMeetings = (
  meetings: PublicMeeting[],
): Record<string, PublicMeeting[]> => {
  const overlaps: Record<string, PublicMeeting[]> = {}

  meetings.forEach((meeting, i) => {
    const overlapping = meetings.filter((otherMeeting, j) => {
      return i !== j && calculateMeetingOverlap(meeting, otherMeeting)
    })

    if (overlapping.length > 0) {
      overlaps[meeting.id] = overlapping
    }
  })

  return overlaps
}

/**
 * Enhanced meeting display utilities with memoization
 */
const colorClassesCache = new Map<string, {
  background: string
  border: string
  text: string
}>()

export const getMeetingColorClasses = (
  meeting: PublicMeeting,
): {
  background: string
  border: string
  text: string
} => {
  // Use status as cache key for performance
  const cacheKey = meeting.status
  
  if (colorClassesCache.has(cacheKey)) {
    return colorClassesCache.get(cacheKey)!
  }

  let colorClasses: {
    background: string
    border: string
    text: string
  }

  if (meeting.status === 'Sedang Berlangsung') {
    colorClasses = {
      background: 'bg-green-500/20',
      border: 'border-green-500',
      text: 'text-green-700 dark:text-green-300',
    }
  } else if (meeting.status === 'Akan Datang') {
    colorClasses = {
      background: 'bg-blue-500/10',
      border: 'border-blue-400',
      text: 'text-blue-700 dark:text-blue-300',
    }
  } else {
    colorClasses = {
      background: 'bg-gray-200/50 dark:bg-gray-700/30',
      border: 'border-gray-300 dark:border-gray-600',
      text: 'text-gray-600 dark:text-gray-400',
    }
  }

  // Cache the result for future use
  colorClassesCache.set(cacheKey, colorClasses)
  return colorClasses
}

/**
 * Performance utilities for large datasets
 */
export const shouldUseVirtualization = (itemCount: number): boolean => {
  return itemCount > 100
}

export const getVirtualizedSlice = <T>(
  items: T[],
  startIndex: number,
  endIndex: number,
): T[] => {
  return items.slice(startIndex, endIndex)
}

/**
 * Debounced search optimization
 */
export const createDebouncedFilter = (
  filterFn: (items: PublicMeeting[], term: string) => PublicMeeting[],
  delay: number = 300,
) => {
  let timeoutId: NodeJS.Timeout
  
  return (items: PublicMeeting[], term: string): Promise<PublicMeeting[]> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        resolve(filterFn(items, term))
      }, delay)
    })
  }
}
