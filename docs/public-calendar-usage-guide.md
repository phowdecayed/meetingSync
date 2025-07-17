# Public Calendar Usage Guide & Best Practices

## Quick Start

### Basic Implementation

```tsx
import PublicCalendar from '@/components/public-calendar'

export default function CalendarPage() {
  return (
    <div className="min-h-screen">
      <PublicCalendar />
    </div>
  )
}
```

The PublicCalendar component is self-contained and handles all data fetching, state management, and user interactions automatically.

## Usage Examples

### 1. Basic Calendar Display

```tsx
// pages/calendar.tsx
import PublicCalendar from '@/components/public-calendar'

export default function CalendarPage() {
  return (
    <main className="container mx-auto">
      <PublicCalendar />
    </main>
  )
}
```

### 2. Embedded in Dashboard

```tsx
// components/dashboard.tsx
import PublicCalendar from '@/components/public-calendar'

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <PublicCalendar />
      </div>
      <div className="space-y-4">
        {/* Other dashboard widgets */}
      </div>
    </div>
  )
}
```

### 3. Custom Layout Configuration

```tsx
// components/custom-calendar.tsx
import { useState } from 'react'
import { CalendarGrid } from '@/components/calendar-grid'
import { CalendarFilters } from '@/components/calendar-filters'
import type { LayoutConfig, PublicMeeting } from '@/types/public-calendar'

const customLayoutConfig: LayoutConfig = {
  columns: {
    mobile: 1,
    tablet: 3,
    desktop: 4,
  },
  cardSize: {
    compact: true,
    showDescription: false,
    maxDescriptionLength: 80,
  },
  grouping: {
    enabled: true,
    by: 'status',
  },
}

export function CustomCalendar({ meetings }: { meetings: PublicMeeting[] }) {
  const [filterState, setFilterState] = useState({
    search: '',
    types: [],
    statuses: [],
    dateRange: 'week' as const,
  })

  return (
    <div className="space-y-4">
      <CalendarFilters
        searchTerm={filterState.search}
        onSearchChange={(search) => setFilterState(prev => ({ ...prev, search }))}
        selectedTypes={filterState.types}
        onTypeFilter={(types) => setFilterState(prev => ({ ...prev, types }))}
        selectedStatuses={filterState.statuses}
        onStatusFilter={(statuses) => setFilterState(prev => ({ ...prev, statuses }))}
        onClearFilters={() => setFilterState({
          search: '',
          types: [],
          statuses: [],
          dateRange: 'week',
        })}
      />
      
      <CalendarGrid
        meetings={meetings}
        groupBy="status"
        loading={false}
        viewMode="compact"
        layoutConfig={customLayoutConfig}
      />
    </div>
  )
}
```

### 4. Individual Component Usage

```tsx
// components/meeting-list.tsx
import { MeetingCard } from '@/components/meeting-card'
import { DateSection } from '@/components/date-section'
import type { PublicMeeting } from '@/types/public-calendar'

export function MeetingList({ meetings }: { meetings: PublicMeeting[] }) {
  const today = new Date()
  const todayMeetings = meetings.filter(m => 
    new Date(m.start).toDateString() === today.toDateString()
  )

  return (
    <DateSection
      date={today}
      meetingCount={todayMeetings.length}
      collapsible={false}
    >
      <div className="space-y-4">
        {todayMeetings.map(meeting => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            compact={false}
            showDate={false}
            viewMode="list"
          />
        ))}
      </div>
    </DateSection>
  )
}
```

## Best Practices

### 1. Performance Optimization

#### For Large Datasets (>100 meetings)

```tsx
import { useMemo } from 'react'
import { shouldUseVirtualization } from '@/lib/calendar-utils'

export function OptimizedCalendar({ meetings }: { meetings: PublicMeeting[] }) {
  const shouldVirtualize = useMemo(() => 
    shouldUseVirtualization(meetings.length), 
    [meetings.length]
  )

  // Implement virtualization for large datasets
  if (shouldVirtualize) {
    return <VirtualizedCalendarGrid meetings={meetings} />
  }

  return <CalendarGrid meetings={meetings} />
}
```

#### Memoization Best Practices

```tsx
import { memo, useMemo, useCallback } from 'react'

const OptimizedMeetingCard = memo(function OptimizedMeetingCard({ 
  meeting, 
  onSelect 
}: {
  meeting: PublicMeeting
  onSelect: (id: string) => void
}) {
  // Memoize expensive calculations
  const formattedTime = useMemo(() => 
    formatMeetingTime(meeting.start, meeting.end), 
    [meeting.start, meeting.end]
  )

  // Memoize event handlers
  const handleClick = useCallback(() => {
    onSelect(meeting.id)
  }, [meeting.id, onSelect])

  return (
    <MeetingCard 
      meeting={meeting}
      onClick={handleClick}
    />
  )
})
```

### 2. Accessibility Implementation

#### Keyboard Navigation

```tsx
import { useRef, useCallback } from 'react'

export function AccessibleCalendar() {
  const mainRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip to main content
    if (event.altKey && event.key === 'm') {
      event.preventDefault()
      mainRef.current?.focus()
    }
    
    // Skip to filters
    if (event.altKey && event.key === 'f') {
      event.preventDefault()
      filtersRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div>
      {/* Skip links */}
      <div className="sr-only focus-within:not-sr-only">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#filters" className="skip-link">
          Skip to filters
        </a>
      </div>

      <div ref={filtersRef} id="filters">
        <CalendarFilters {...filterProps} />
      </div>

      <main ref={mainRef} id="main-content">
        <CalendarGrid {...gridProps} />
      </main>
    </div>
  )
}
```

#### Screen Reader Support

```tsx
export function AccessibleMeetingCard({ meeting }: { meeting: PublicMeeting }) {
  const [announceMessage, setAnnounceMessage] = useState('')

  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceMessage(message)
    setTimeout(() => setAnnounceMessage(''), 1000)
  }, [])

  return (
    <>
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceMessage}
      </div>

      <MeetingCard
        meeting={meeting}
        onStatusChange={(status) => 
          announceToScreenReader(`Meeting status changed to ${status}`)
        }
      />
    </>
  )
}
```

### 3. Error Handling

#### Comprehensive Error Boundaries

```tsx
import { ErrorBoundary } from 'react-error-boundary'

function CalendarErrorFallback({ 
  error, 
  resetErrorBoundary 
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-lg font-semibold mb-2">
        Something went wrong
      </h2>
      <p className="text-muted-foreground mb-4">
        {error.message}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        Try again
      </button>
    </div>
  )
}

export function RobustCalendar() {
  return (
    <ErrorBoundary
      FallbackComponent={CalendarErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Calendar error:', error, errorInfo)
        // Log to error reporting service
      }}
    >
      <PublicCalendar />
    </ErrorBoundary>
  )
}
```

#### Network Error Handling

```tsx
import { useState, useCallback } from 'react'

export function NetworkAwareCalendar() {
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const handleNetworkError = useCallback(async (error: Error) => {
    setNetworkError(error.message)
    
    // Exponential backoff retry
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
    
    setTimeout(() => {
      setRetryCount(prev => prev + 1)
      // Retry logic here
    }, delay)
  }, [retryCount])

  if (networkError) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive mb-4">{networkError}</p>
        <button
          onClick={() => {
            setNetworkError(null)
            setRetryCount(0)
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  return <PublicCalendar onError={handleNetworkError} />
}
```

### 4. Responsive Design

#### Mobile-First Approach

```tsx
import { useMediaQuery } from '@/hooks/use-media-query'

export function ResponsiveCalendar() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  const layoutConfig = useMemo(() => ({
    columns: {
      mobile: 1,
      tablet: isMobile ? 1 : 2,
      desktop: isTablet ? 2 : 3,
    },
    cardSize: {
      compact: isMobile,
      showDescription: !isMobile,
      maxDescriptionLength: isMobile ? 60 : 120,
    },
  }), [isMobile, isTablet])

  return (
    <CalendarGrid
      layoutConfig={layoutConfig}
      viewMode={isMobile ? 'list' : 'grid'}
      // ... other props
    />
  )
}
```

#### Touch-Friendly Interactions

```tsx
export function TouchFriendlyCalendar() {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      // Navigate to next week
    }
    if (isRightSwipe) {
      // Navigate to previous week
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <PublicCalendar />
    </div>
  )
}
```

### 5. Theming and Customization

#### Custom Theme Implementation

```tsx
// themes/calendar-theme.ts
export const calendarTheme = {
  colors: {
    primary: 'hsl(210 40% 98%)',
    secondary: 'hsl(210 40% 96%)',
    accent: 'hsl(210 40% 90%)',
    muted: 'hsl(210 40% 85%)',
    // Meeting status colors
    ongoing: 'hsl(142 76% 36%)',
    upcoming: 'hsl(210 40% 60%)',
    completed: 'hsl(210 40% 80%)',
  },
  spacing: {
    cardPadding: '1rem',
    cardGap: '1rem',
    sectionGap: '2rem',
  },
  typography: {
    title: '1.125rem',
    subtitle: '0.875rem',
    body: '0.75rem',
  },
}

// components/themed-calendar.tsx
import { ThemeProvider } from '@/components/theme-provider'

export function ThemedCalendar() {
  return (
    <ThemeProvider theme={calendarTheme}>
      <PublicCalendar />
    </ThemeProvider>
  )
}
```

#### CSS Custom Properties

```css
/* styles/calendar-theme.css */
:root {
  --calendar-primary: hsl(210 40% 98%);
  --calendar-secondary: hsl(210 40% 96%);
  --calendar-accent: hsl(210 40% 90%);
  
  --meeting-ongoing: hsl(142 76% 36%);
  --meeting-upcoming: hsl(210 40% 60%);
  --meeting-completed: hsl(210 40% 80%);
  
  --card-padding: 1rem;
  --card-gap: 1rem;
  --section-gap: 2rem;
}

.calendar-card {
  padding: var(--card-padding);
  gap: var(--card-gap);
}

.calendar-section {
  margin-bottom: var(--section-gap);
}
```

### 6. Testing Best Practices

#### Component Testing

```tsx
// __tests__/calendar.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PublicCalendar from '@/components/public-calendar'

describe('PublicCalendar', () => {
  it('should filter meetings by search term', async () => {
    const user = userEvent.setup()
    render(<PublicCalendar />)
    
    const searchInput = screen.getByLabelText(/search meetings/i)
    await user.type(searchInput, 'team meeting')
    
    await waitFor(() => {
      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
      expect(screen.queryByText('Other Meeting')).not.toBeInTheDocument()
    })
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()
    render(<PublicCalendar />)
    
    // Test skip links
    await user.keyboard('{Alt>}m{/Alt}')
    expect(screen.getByRole('main')).toHaveFocus()
    
    // Test filter navigation
    await user.keyboard('{Alt>}f{/Alt}')
    expect(screen.getByRole('search')).toHaveFocus()
  })
})
```

#### Integration Testing

```tsx
// __tests__/calendar-integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import PublicCalendar from '@/components/public-calendar'

const server = setupServer(
  rest.get('/api/public/meetings', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: '1',
        title: 'Test Meeting',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        // ... other fields
      }
    ]))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Calendar Integration', () => {
  it('should load and display meetings from API', async () => {
    render(<PublicCalendar />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument()
    })
  })
})
```

## Common Patterns

### 1. Custom Hooks for Calendar Logic

```tsx
// hooks/use-calendar-data.ts
import { useState, useEffect, useCallback } from 'react'
import type { PublicMeeting, FilterState } from '@/types/public-calendar'

export function useCalendarData() {
  const [meetings, setMeetings] = useState<PublicMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/public/meetings')
      const data = await response.json()
      setMeetings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  return { meetings, loading, error, refetch: fetchMeetings }
}

// Usage
export function CustomCalendar() {
  const { meetings, loading, error, refetch } = useCalendarData()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return <CalendarGrid meetings={meetings} />
}
```

### 2. Filter State Management

```tsx
// hooks/use-calendar-filters.ts
import { useState, useMemo } from 'react'
import { filterMeetingsBySearch } from '@/lib/calendar-utils'
import type { PublicMeeting, FilterState } from '@/types/public-calendar'

export function useCalendarFilters(meetings: PublicMeeting[]) {
  const [filterState, setFilterState] = useState<FilterState>({
    search: '',
    types: [],
    statuses: [],
    dateRange: 'week',
  })

  const filteredMeetings = useMemo(() => {
    let filtered = meetings

    if (filterState.search) {
      filtered = filterMeetingsBySearch(filtered, filterState.search)
    }

    if (filterState.types.length > 0) {
      filtered = filtered.filter(m => filterState.types.includes(m.meetingType))
    }

    if (filterState.statuses.length > 0) {
      filtered = filtered.filter(m => filterState.statuses.includes(m.status))
    }

    return filtered
  }, [meetings, filterState])

  return {
    filterState,
    setFilterState,
    filteredMeetings,
    clearFilters: () => setFilterState({
      search: '',
      types: [],
      statuses: [],
      dateRange: 'week',
    }),
  }
}
```

### 3. Responsive Layout Hook

```tsx
// hooks/use-responsive-layout.ts
import { useState, useEffect } from 'react'
import type { ResponsiveBreakpoint, LayoutConfig } from '@/types/public-calendar'

export function useResponsiveLayout(): {
  breakpoint: ResponsiveBreakpoint
  layoutConfig: LayoutConfig
} {
  const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>('desktop')

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width < 768) setBreakpoint('mobile')
      else if (width < 1024) setBreakpoint('tablet')
      else setBreakpoint('desktop')
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  const layoutConfig: LayoutConfig = useMemo(() => ({
    columns: {
      mobile: 1,
      tablet: breakpoint === 'mobile' ? 1 : 2,
      desktop: breakpoint === 'tablet' ? 2 : 3,
    },
    cardSize: {
      compact: breakpoint === 'mobile',
      showDescription: breakpoint !== 'mobile',
      maxDescriptionLength: breakpoint === 'mobile' ? 60 : 120,
    },
    grouping: {
      enabled: true,
      by: 'date',
    },
  }), [breakpoint])

  return { breakpoint, layoutConfig }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Performance Issues with Large Datasets

**Problem**: Calendar becomes slow with >100 meetings

**Solution**:
```tsx
import { useMemo } from 'react'
import { shouldUseVirtualization } from '@/lib/calendar-utils'

export function PerformantCalendar({ meetings }: { meetings: PublicMeeting[] }) {
  const shouldVirtualize = shouldUseVirtualization(meetings.length)
  
  const optimizedMeetings = useMemo(() => {
    if (shouldVirtualize) {
      // Implement pagination or virtualization
      return meetings.slice(0, 50) // Show first 50 meetings
    }
    return meetings
  }, [meetings, shouldVirtualize])

  return <CalendarGrid meetings={optimizedMeetings} />
}
```

#### 2. Mobile Touch Issues

**Problem**: Touch interactions not working properly on mobile

**Solution**:
```tsx
export function TouchOptimizedCalendar() {
  return (
    <div 
      className="touch-pan-y" // Enable vertical scrolling
      style={{ 
        touchAction: 'pan-y', // CSS touch-action
        WebkitOverflowScrolling: 'touch' // iOS smooth scrolling
      }}
    >
      <PublicCalendar />
    </div>
  )
}
```

#### 3. Accessibility Issues

**Problem**: Screen readers not announcing dynamic content

**Solution**:
```tsx
export function AccessibleCalendar() {
  const [announcements, setAnnouncements] = useState('')

  const announce = useCallback((message: string) => {
    setAnnouncements(message)
    setTimeout(() => setAnnouncements(''), 1000)
  }, [])

  return (
    <>
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcements}
      </div>
      <PublicCalendar onStatusChange={announce} />
    </>
  )
}
```

#### 4. Theme Inconsistencies

**Problem**: Calendar doesn't match application theme

**Solution**:
```tsx
// Use CSS custom properties for theming
export function ThemedCalendar() {
  useEffect(() => {
    // Apply theme variables
    document.documentElement.style.setProperty('--calendar-primary', 'var(--primary)')
    document.documentElement.style.setProperty('--calendar-secondary', 'var(--secondary)')
  }, [])

  return <PublicCalendar />
}
```

## Migration Checklist

When upgrading from FullCalendar or implementing the new system:

- [ ] Remove FullCalendar dependencies
- [ ] Update import statements
- [ ] Test responsive behavior on all devices
- [ ] Verify accessibility with screen readers
- [ ] Check performance with realistic data volumes
- [ ] Test keyboard navigation
- [ ] Validate theme integration
- [ ] Update tests for new component structure
- [ ] Document any custom modifications
- [ ] Train users on new features

## Support and Resources

### Documentation
- [Component API Reference](./public-calendar-components.md)
- [Type Definitions](../src/types/public-calendar.ts)
- [Utility Functions](../src/lib/calendar-utils.ts)

### Testing
- [Test Examples](../src/components/__tests__)
- [Integration Tests](../src/components/__tests__/public-calendar.integration.test.tsx)

### Performance
- Enable debug mode: `localStorage.setItem('calendar-debug', 'true')`
- Monitor performance metrics in browser dev tools
- Use React DevTools Profiler for component analysis