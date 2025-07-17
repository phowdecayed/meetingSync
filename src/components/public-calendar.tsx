'use client'

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { CalendarHeader } from '@/components/calendar-header'
import { CalendarFilters } from '@/components/calendar-filters'
import { CalendarGrid } from '@/components/calendar-grid'
import {
  enhanceMeetings,
  defaultLayoutConfig,
  filterMeetingsBySearch,
} from '@/lib/calendar-utils'
import type {
  PublicMeeting,
  MeetingType,
  MeetingStatus,
  FilterState,
  LayoutConfig,
  LoadingState,
  CalendarError,
  PerformanceMetrics,
} from '@/types/public-calendar'

// Memoized error display component
const ErrorDisplay = memo(function ErrorDisplay({
  error,
  onRetry,
}: {
  error: CalendarError
  onRetry: () => void
}) {
  return (
    <div 
      className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/50 dark:to-indigo-900/60"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 rounded-full p-6" aria-hidden="true">
          <Loader2 className="text-destructive h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h3 
            className="text-foreground text-lg font-semibold"
            id="error-title"
          >
            Gagal Memuat Data
          </h3>
          <p 
            className="text-muted-foreground max-w-md"
            id="error-message"
          >
            {error.message}
          </p>
          <button
            onClick={onRetry}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-4 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            aria-describedby="error-title error-message"
            type="button"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    </div>
  )
})

// Memoized loading display component
const LoadingDisplay = memo(function LoadingDisplay() {
  return (
    <div 
      className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/50 dark:to-indigo-900/60"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 
          className="text-primary h-12 w-12 animate-spin" 
          aria-hidden="true"
        />
        <p 
          className="text-muted-foreground text-lg font-medium"
          id="loading-message"
        >
          Memuat kalender rapat...
        </p>
      </div>
    </div>
  )
})

const PublicCalendar = memo(function PublicCalendar() {
  // Core state
  const [meetings, setMeetings] = useState<PublicMeeting[]>([])
  const [loading, setLoading] = useState<LoadingState>('loading')
  const [error, setError] = useState<CalendarError | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Accessibility state
  const [announceMessage, setAnnounceMessage] = useState('')
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null)
  
  // Accessibility refs
  const skipLinkRef = useRef<HTMLAnchorElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  // Accessibility announcement function
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceMessage(message)
    // Clear the message after a short delay to allow screen readers to announce it
    setTimeout(() => setAnnounceMessage(''), 1000)
  }, [])

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip to main content (Alt + M)
    if (event.altKey && event.key === 'm') {
      event.preventDefault()
      mainContentRef.current?.focus()
      announceToScreenReader('Navigated to main content')
    }
    
    // Skip to filters (Alt + F)
    if (event.altKey && event.key === 'f') {
      event.preventDefault()
      filtersRef.current?.focus()
      announceToScreenReader('Navigated to filters')
    }

    // Escape key to clear focus and return to main navigation
    if (event.key === 'Escape') {
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur()
        announceToScreenReader('Focus cleared')
      }
    }
  }, [announceToScreenReader])

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({
    search: '',
    types: [],
    statuses: [],
    dateRange: 'week',
  })

  // Layout configuration
  const [layoutConfig] = useState<LayoutConfig>(defaultLayoutConfig)

  // Performance monitoring
  const performanceRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    filterTime: 0,
    dataSize: 0,
    lastUpdate: Date.now(),
  })

  // Performance measurement hook
  const measurePerformance = useCallback((operation: string, fn: () => void) => {
    const start = performance.now()
    fn()
    const end = performance.now()
    const duration = end - start

    // Log performance for large datasets or slow operations
    if (duration > 100 || meetings.length > 500) {
      console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms (${meetings.length} meetings)`)
    }

    // Update performance metrics
    performanceRef.current = {
      ...performanceRef.current,
      renderTime: operation === 'render' ? duration : performanceRef.current.renderTime,
      filterTime: operation === 'filter' ? duration : performanceRef.current.filterTime,
      dataSize: meetings.length,
      lastUpdate: Date.now(),
    }
  }, [meetings.length])

  // Data fetching
  const fetchMeetings = useCallback(async (showLoader: boolean = true) => {
    if (showLoader) {
      setLoading('loading')
    } else {
      setLoading('refreshing')
    }

    setError(null)

    try {
      const response = await fetch('/api/public/meetings')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch meetings`)
      }

      const rawData = await response.json()

      // Enhance meetings with calculated fields
      const enhancedMeetings = enhanceMeetings(rawData)
      setMeetings(enhancedMeetings)
    } catch (err) {
      const error: CalendarError = {
        type: err instanceof TypeError ? 'network' : 'unknown',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        timestamp: new Date(),
      }
      setError(error)
      console.error('Failed to fetch meetings:', err)
    } finally {
      setLoading('idle')
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchMeetings(true)
  }, [fetchMeetings])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMeetings(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchMeetings])

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error)
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(console.error)
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Date navigation handlers
  const handleDateChange = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  const handleRefresh = useCallback(() => {
    fetchMeetings(true)
  }, [fetchMeetings])

  // Filter handlers
  const handleSearchChange = useCallback((search: string) => {
    setFilterState((prev) => ({ ...prev, search }))
  }, [])

  const handleTypeFilter = useCallback((types: MeetingType[]) => {
    setFilterState((prev) => ({ ...prev, types }))
  }, [])

  const handleStatusFilter = useCallback((statuses: MeetingStatus[]) => {
    setFilterState((prev) => ({ ...prev, statuses }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilterState({
      search: '',
      types: [],
      statuses: [],
      dateRange: 'week',
    })
  }, [])

  // Optimized filtering with performance measurement
  const filteredMeetings = useMemo(() => {
    const startTime = performance.now()
    
    let filtered = meetings

    // Early return for empty datasets
    if (meetings.length === 0) {
      return filtered
    }

    // Apply search filter (most selective first)
    if (filterState.search.trim()) {
      filtered = filterMeetingsBySearch(filtered, filterState.search)
    }

    // Apply type filter
    if (filterState.types.length > 0) {
      filtered = filtered.filter((meeting) =>
        filterState.types.includes(meeting.meetingType),
      )
    }

    // Apply status filter
    if (filterState.statuses.length > 0) {
      filtered = filtered.filter((meeting) =>
        filterState.statuses.includes(meeting.status),
      )
    }

    // Apply date range filter based on current week (pre-calculate dates)
    const weekStart = startOfWeek(currentDate, { locale: id })
    const weekEnd = endOfWeek(currentDate, { locale: id })
    const weekStartTime = weekStart.getTime()
    const weekEndTime = weekEnd.getTime()

    filtered = filtered.filter((meeting) => {
      const meetingTime = new Date(meeting.start).getTime()
      return meetingTime >= weekStartTime && meetingTime <= weekEndTime
    })

    // Performance logging
    const endTime = performance.now()
    const duration = endTime - startTime
    
    if (duration > 50 || meetings.length > 200) {
      console.log(`[Filter Performance] ${duration.toFixed(2)}ms for ${meetings.length} → ${filtered.length} meetings`)
    }

    return filtered
  }, [meetings, filterState, currentDate])

  // Loading state
  if (loading === 'loading') {
    return <LoadingDisplay />
  }

  // Error state
  if (error && meetings.length === 0) {
    return <ErrorDisplay error={error} onRetry={() => fetchMeetings(true)} />
  }

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/50 dark:to-indigo-900/60">
      {/* Skip Links */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          ref={skipLinkRef}
          href="#main-content"
          className="absolute left-4 top-4 z-50 rounded bg-primary px-4 py-2 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={(e) => {
            e.preventDefault()
            mainContentRef.current?.focus()
            announceToScreenReader('Skipped to main content')
          }}
        >
          Skip to main content
        </a>
        <a
          href="#filters"
          className="absolute left-4 top-16 z-50 rounded bg-primary px-4 py-2 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={(e) => {
            e.preventDefault()
            filtersRef.current?.focus()
            announceToScreenReader('Skipped to filters')
          }}
        >
          Skip to filters
        </a>
      </div>

      {/* Screen Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announceMessage}
      </div>

      <div 
        className="m-4 flex h-full flex-col overflow-hidden rounded-2xl bg-white/30 shadow-2xl backdrop-blur-xl dark:bg-gray-800/30"
        role="application"
        aria-label="Public Calendar Application"
      >
        {/* Calendar Header */}
        <CalendarHeader
          currentDate={currentDate}
          onDateChange={handleDateChange}
          onToggleFullscreen={toggleFullscreen}
          onRefresh={handleRefresh}
          isRefreshing={loading === 'refreshing'}
          isFullscreen={isFullscreen}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with Filters */}
          <aside 
            className="bg-background/50 hidden w-80 flex-shrink-0 border-r backdrop-blur-sm lg:block"
            aria-label="Calendar filters and search"
            role="complementary"
          >
            <div 
              className="h-full overflow-y-auto p-4"
              ref={filtersRef}
              tabIndex={-1}
              id="filters"
              aria-label="Filter controls"
            >
              <CalendarFilters
                searchTerm={filterState.search}
                onSearchChange={handleSearchChange}
                selectedTypes={filterState.types}
                onTypeFilter={handleTypeFilter}
                selectedStatuses={filterState.statuses}
                onStatusFilter={handleStatusFilter}
                onClearFilters={handleClearFilters}
              />
            </div>
          </aside>

          {/* Main Calendar Grid */}
          <main 
            className="flex-1 overflow-y-auto"
            role="main"
            aria-label="Calendar meetings"
          >
            <div 
              className="p-4 lg:p-6"
              ref={mainContentRef}
              tabIndex={-1}
              id="main-content"
            >
              {/* Mobile Filters */}
              <div 
                className="mb-4 lg:hidden"
                role="region"
                aria-label="Mobile filter controls"
              >
                <CalendarFilters
                  searchTerm={filterState.search}
                  onSearchChange={handleSearchChange}
                  selectedTypes={filterState.types}
                  onTypeFilter={handleTypeFilter}
                  selectedStatuses={filterState.statuses}
                  onStatusFilter={handleStatusFilter}
                  onClearFilters={handleClearFilters}
                />
              </div>

              {/* Calendar Grid */}
              <section 
                aria-label={`Calendar showing ${filteredMeetings.length} meetings`}
                role="region"
              >
                <CalendarGrid
                  meetings={filteredMeetings}
                  groupBy="date"
                  loading={loading !== 'idle'}
                  viewMode="grid"
                  layoutConfig={layoutConfig}
                />
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
})

export default PublicCalendar