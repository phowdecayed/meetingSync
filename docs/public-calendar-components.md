# Public Calendar Components Documentation

## Overview

The Public Calendar system is a modern, responsive calendar layout that replaces the previous FullCalendar-based implementation. It provides a card-based grid layout with advanced filtering, search capabilities, and accessibility features.

## Architecture

The system follows a modular component architecture:

```
PublicCalendar (Main Container)
├── CalendarHeader (Navigation & Controls)
├── CalendarFilters (Search & Filter Controls)
├── CalendarGrid (Responsive Meeting Display)
│   ├── DateSection (Date Grouping)
│   └── MeetingCard[] (Individual Meeting Cards)
└── Error/Loading States
```

## Components

### PublicCalendar

**Location**: `src/components/public-calendar.tsx`

The main container component that orchestrates all calendar functionality.

#### Features
- **State Management**: Manages meetings data, filters, loading states, and UI state
- **Data Fetching**: Handles API calls with automatic refresh every 30 seconds
- **Performance Optimization**: Implements memoization and performance monitoring
- **Accessibility**: Full keyboard navigation and screen reader support
- **Error Handling**: Comprehensive error boundaries and retry mechanisms

#### Props
This is the root component and doesn't accept props.

#### Key State
```typescript
const [meetings, setMeetings] = useState<PublicMeeting[]>([])
const [loading, setLoading] = useState<LoadingState>('loading')
const [error, setError] = useState<CalendarError | null>(null)
const [filterState, setFilterState] = useState<FilterState>({
  search: '',
  types: [],
  statuses: [],
  dateRange: 'week',
})
```

#### Accessibility Features
- Skip links for keyboard navigation
- ARIA labels and roles
- Screen reader announcements
- Focus management
- Keyboard shortcuts (Alt+M for main content, Alt+F for filters)

#### Performance Features
- Memoized components with React.memo
- Optimized filtering with early returns
- Performance monitoring for large datasets
- Debounced search input

---

### CalendarHeader

**Location**: `src/components/calendar-header.tsx`

Navigation header with date controls and action buttons.

#### Props
```typescript
interface CalendarHeaderProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  onToggleFullscreen: () => void
  onRefresh: () => void
  isRefreshing: boolean
  isFullscreen: boolean
}
```

#### Features
- **Date Navigation**: Previous/next week navigation with today button
- **Fullscreen Toggle**: Enter/exit fullscreen mode
- **Manual Refresh**: Force data refresh with loading indicator
- **Responsive Design**: Adapts layout for mobile/desktop
- **Accessibility**: Full keyboard support and ARIA labels

#### Usage Example
```tsx
<CalendarHeader
  currentDate={currentDate}
  onDateChange={handleDateChange}
  onToggleFullscreen={toggleFullscreen}
  onRefresh={handleRefresh}
  isRefreshing={loading === 'refreshing'}
  isFullscreen={isFullscreen}
/>
```

---

### CalendarFilters

**Location**: `src/components/calendar-filters.tsx`

Search and filtering controls for meetings.

#### Props
```typescript
interface CalendarFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedTypes: MeetingType[]
  onTypeFilter: (types: MeetingType[]) => void
  selectedStatuses: MeetingStatus[]
  onStatusFilter: (statuses: MeetingStatus[]) => void
  onClearFilters: () => void
}
```

#### Features
- **Debounced Search**: 300ms debounce for search input
- **Multi-Select Filters**: Meeting type and status filtering
- **Responsive Layout**: Collapsible filters on mobile
- **Active Filter Display**: Shows applied filters with removal options
- **Clear All**: One-click filter clearing

#### Filter Types
- **Search**: Searches across title, description, organizer, and room
- **Meeting Type**: Internal vs External meetings
- **Status**: Akan Datang, Sedang Berlangsung, Selesai

#### Usage Example
```tsx
<CalendarFilters
  searchTerm={filterState.search}
  onSearchChange={handleSearchChange}
  selectedTypes={filterState.types}
  onTypeFilter={handleTypeFilter}
  selectedStatuses={filterState.statuses}
  onStatusFilter={handleStatusFilter}
  onClearFilters={handleClearFilters}
/>
```

---

### CalendarGrid

**Location**: `src/components/calendar-grid.tsx`

Responsive grid layout for displaying meetings.

#### Props
```typescript
interface CalendarGridProps {
  meetings: PublicMeeting[]
  groupBy: GroupingMode
  loading: boolean
  viewMode: ViewMode
  layoutConfig: LayoutConfig
}
```

#### Features
- **Responsive Grid**: CSS Grid with breakpoint-based columns
- **Date Grouping**: Groups meetings by date with collapsible sections
- **Loading States**: Skeleton loading with shimmer effects
- **Empty States**: Handles no meetings and no search results
- **Performance**: Optimized rendering for large datasets

#### Layout Configuration
```typescript
const defaultLayoutConfig: LayoutConfig = {
  columns: {
    mobile: 1,    // Single column on mobile
    tablet: 2,    // 2 columns on tablet
    desktop: 3,   // 3 columns on desktop
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
```

#### Usage Example
```tsx
<CalendarGrid
  meetings={filteredMeetings}
  groupBy="date"
  loading={loading !== 'idle'}
  viewMode="grid"
  layoutConfig={layoutConfig}
/>
```

---

### MeetingCard

**Location**: `src/components/meeting-card.tsx`

Individual meeting display card with enhanced information.

#### Props
```typescript
interface MeetingCardProps {
  meeting: PublicMeeting
  compact?: boolean
  showDate?: boolean
  viewMode?: ViewMode
}
```

#### Features
- **Status-Based Styling**: Color-coded borders and backgrounds
- **Expandable Descriptions**: Truncated text with expand/collapse
- **Time Display**: Formatted time ranges with duration
- **Meeting Details**: Organizer, room, meeting ID display
- **Responsive Design**: Adapts to different screen sizes

#### Visual Indicators
- **Status Colors**:
  - Sedang Berlangsung: Green border/background
  - Akan Datang: Blue border/background
  - Selesai: Gray border/background
- **Meeting Type Badges**:
  - Internal: Red badge
  - External: Blue badge

#### Usage Example
```tsx
<MeetingCard
  meeting={meeting}
  compact={shouldUseCompactView}
  showDate={groupBy !== 'date'}
  viewMode="grid"
/>
```

---

### DateSection

**Location**: `src/components/date-section.tsx`

Date grouping header with collapsible content.

#### Props
```typescript
interface DateSectionProps {
  date: Date
  meetingCount: number
  children?: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
}
```

#### Features
- **Date Formatting**: Intelligent date display (Today, weekday, full date)
- **Meeting Count**: Shows number of meetings in section
- **Collapsible**: Optional expand/collapse functionality
- **Keyboard Support**: Enter/Space key support for toggling

#### Usage Example
```tsx
<DateSection
  date={groupDate}
  meetingCount={groupMeetings.length}
  collapsible={true}
  defaultExpanded={true}
>
  {/* Meeting cards */}
</DateSection>
```

## Types and Interfaces

### Core Types

```typescript
// Meeting data structure
type PublicMeeting = {
  id: string
  title: string
  description: string | null
  start: string
  end: string
  organizerName: string
  status: MeetingStatus
  meetingId?: string | null
  meetingType: MeetingType
  meetingRoom: string | null
  duration?: number // calculated field in minutes
  isToday?: boolean // calculated field
  isOngoing?: boolean // calculated field
}

// Meeting status options
type MeetingStatus = 'Akan Datang' | 'Sedang Berlangsung' | 'Selesai'

// Meeting type options
type MeetingType = 'internal' | 'external'

// View modes
type ViewMode = 'grid' | 'list' | 'compact'

// Filter state
type FilterState = {
  search: string
  types: MeetingType[]
  statuses: MeetingStatus[]
  dateRange: DateRange
}
```

### Layout Configuration

```typescript
type LayoutConfig = {
  columns: {
    mobile: number
    tablet: number
    desktop: number
  }
  cardSize: {
    compact: boolean
    showDescription: boolean
    maxDescriptionLength: number
  }
  grouping: {
    enabled: boolean
    by: GroupingMode
  }
}
```

## Utility Functions

### Date Formatting
- `formatMeetingTime()`: Formats time ranges
- `formatMeetingDate()`: Formats dates with relative terms
- `formatDateSection()`: Formats section headers
- `formatDuration()`: Formats meeting duration

### Meeting Enhancement
- `enhanceMeeting()`: Adds calculated fields to meeting data
- `calculateMeetingStatus()`: Determines current meeting status
- `calculateMeetingDuration()`: Calculates meeting length

### Filtering and Grouping
- `filterMeetingsBySearch()`: Text-based filtering
- `groupMeetingsByDate()`: Groups meetings by date
- `sortMeetingsByStartTime()`: Sorts meetings chronologically

### Responsive Utilities
- `getResponsiveBreakpoint()`: Determines current breakpoint
- `shouldShowCompactView()`: Decides on compact layout
- `getMaxDescriptionLength()`: Gets optimal text length

## Performance Considerations

### Optimization Techniques
1. **React.memo**: All components are memoized
2. **useMemo**: Expensive calculations are memoized
3. **useCallback**: Event handlers are memoized
4. **Debounced Search**: 300ms debounce for search input
5. **Early Returns**: Filtering optimizations for large datasets

### Performance Monitoring
The system includes built-in performance monitoring:
- Render time tracking
- Filter operation timing
- Dataset size monitoring
- Automatic logging for slow operations

### Large Dataset Handling
- Virtualization recommendations for >100 meetings
- Optimized filtering algorithms
- Cached color calculations
- Efficient grouping operations

## Accessibility Features

### Keyboard Navigation
- **Tab Navigation**: All interactive elements are keyboard accessible
- **Skip Links**: Alt+M (main content), Alt+F (filters)
- **Arrow Keys**: Date navigation
- **Enter/Space**: Button activation and card expansion
- **Escape**: Clear focus and return to main navigation

### Screen Reader Support
- **ARIA Labels**: Comprehensive labeling for all elements
- **Live Regions**: Status announcements for dynamic content
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Role Attributes**: Clear element purposes

### Visual Accessibility
- **High Contrast**: Supports both light and dark themes
- **Color Independence**: Information not conveyed by color alone
- **Focus Indicators**: Clear focus outlines
- **Text Scaling**: Responsive to browser zoom

## Error Handling

### Error Types
```typescript
type CalendarError = {
  type: 'network' | 'parsing' | 'unknown'
  message: string
  timestamp: Date
}
```

### Error States
- **Network Errors**: Connection issues with retry functionality
- **Parsing Errors**: Invalid data format handling
- **Empty States**: No meetings or no search results
- **Loading Failures**: Graceful degradation

### Recovery Mechanisms
- Automatic retry for network errors
- Fallback to cached data when available
- User-initiated refresh options
- Error boundary protection

## Testing

### Test Coverage
- Unit tests for all components
- Integration tests for user workflows
- Accessibility tests with automated tools
- Performance tests for large datasets
- Visual regression tests

### Test Files
- `src/components/__tests__/public-calendar.integration.test.tsx`
- `src/components/__tests__/calendar-*.test.tsx`
- `src/lib/__tests__/calendar-utils.test.ts`

## Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement
- CSS Grid with flexbox fallback
- Modern JavaScript with polyfills
- Responsive design with mobile-first approach
- Graceful degradation for older browsers

## Migration Guide

### From FullCalendar
The new system maintains API compatibility while providing enhanced features:

1. **Data Format**: Same meeting data structure
2. **Props**: Compatible component props
3. **Styling**: Improved with modern design tokens
4. **Performance**: Better optimization for large datasets
5. **Accessibility**: Enhanced keyboard and screen reader support

### Breaking Changes
- FullCalendar dependency removed
- Some internal event handlers changed
- CSS classes updated for new design system

## Troubleshooting

### Common Issues
1. **Performance**: Use virtualization for >100 meetings
2. **Layout**: Check CSS Grid support in older browsers
3. **Accessibility**: Ensure proper ARIA labels are maintained
4. **Mobile**: Test touch interactions on various devices

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('calendar-debug', 'true')
```

This enables:
- Performance timing logs
- Filter operation details
- State change tracking
- Error details