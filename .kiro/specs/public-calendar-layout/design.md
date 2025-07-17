# Design Document

## Overview

This design transforms the public calendar from a FullCalendar list view into a modern, responsive card-based layout that provides better visual organization and user experience. The new design will replace the FullCalendar dependency with a custom implementation that offers more control over layout and styling while maintaining all existing functionality.

## Architecture

### Component Structure

```
PublicCalendar (Main Container)
├── CalendarHeader (Navigation & Controls)
├── CalendarFilters (Search & Filter Controls)
├── CalendarGrid (Responsive Meeting Display)
│   ├── DateSection (Date Grouping)
│   └── MeetingCard[] (Individual Meeting Cards)
└── CalendarFooter (Status & Refresh Info)
```

### Layout System

The new layout will use CSS Grid and Flexbox for responsive design:

- **Desktop (≥1024px)**: 3-4 column grid with sidebar filters
- **Tablet (768px-1023px)**: 2-3 column grid with collapsible filters
- **Mobile (≤767px)**: Single column with stacked cards

## Components and Interfaces

### 1. CalendarHeader Component

**Purpose**: Navigation controls and title display

**Props**:
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

**Features**:
- Date navigation (previous/next week, today button)
- Fullscreen toggle
- Manual refresh button
- Current date/week display

### 2. CalendarFilters Component

**Purpose**: Search and filtering functionality

**Props**:
```typescript
interface CalendarFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedTypes: MeetingType[]
  onTypeFilter: (types: MeetingType[]) => void
  selectedStatuses: MeetingStatus[]
  onStatusFilter: (statuses: MeetingStatus[]) => void
}
```

**Features**:
- Search input with debounced filtering
- Meeting type filter (internal/external)
- Status filter (upcoming/ongoing/completed)
- Clear filters button

### 3. CalendarGrid Component

**Purpose**: Main content area with responsive meeting display

**Props**:
```typescript
interface CalendarGridProps {
  meetings: PublicMeeting[]
  groupBy: 'date' | 'status' | 'type'
  loading: boolean
}
```

**Features**:
- Responsive CSS Grid layout
- Date-based grouping with section headers
- Loading skeleton states
- Empty state handling

### 4. Enhanced MeetingCard Component

**Purpose**: Individual meeting display with improved design

**Props**:
```typescript
interface MeetingCardProps {
  meeting: PublicMeeting
  compact?: boolean
  showDate?: boolean
}
```

**Features**:
- Status-based color coding
- Time display with duration
- Expandable description
- Meeting type badges
- Organizer and location info
- Meeting ID formatting for external meetings

### 5. DateSection Component

**Purpose**: Date grouping headers

**Props**:
```typescript
interface DateSectionProps {
  date: Date
  meetingCount: number
  children: React.ReactNode
}
```

## Data Models

### Enhanced PublicMeeting Type

```typescript
type PublicMeeting = {
  id: string
  title: string
  description: string | null
  start: string
  end: string
  organizerName: string
  status: MeetingStatus
  meetingId?: string | null
  meetingType: 'internal' | 'external'
  meetingRoom: string | null
  duration?: number // calculated field
  isToday?: boolean // calculated field
}

type MeetingStatus = 'Akan Datang' | 'Sedang Berlangsung' | 'Selesai'

type ViewMode = 'grid' | 'list' | 'compact'

type FilterState = {
  search: string
  types: ('internal' | 'external')[]
  statuses: MeetingStatus[]
  dateRange: 'today' | 'week' | 'month'
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
    by: 'date' | 'status' | 'type'
  }
}
```

## Error Handling

### Loading States
- Skeleton cards during initial load
- Shimmer effect for refresh operations
- Progressive loading for large datasets

### Error States
- Network error handling with retry mechanism
- Empty state when no meetings found
- Search no-results state
- Filter no-results state

### Fallback Behavior
- Graceful degradation if CSS Grid not supported
- Fallback to list view on very small screens
- Maintain functionality without JavaScript (basic display)

## Testing Strategy

### Unit Tests
- Component rendering with different props
- Filter logic and search functionality
- Date navigation and formatting
- Meeting status calculations
- Responsive layout behavior

### Integration Tests
- API data fetching and error handling
- Real-time updates and refresh functionality
- Fullscreen mode toggle
- Theme switching (light/dark)

### Visual Regression Tests
- Layout consistency across breakpoints
- Card styling variations
- Loading and error states
- Theme variations

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- Color contrast compliance
- Focus management

## Implementation Approach

### Phase 1: Core Layout Structure
- Remove FullCalendar dependency
- Implement basic grid layout
- Create responsive breakpoints
- Add date navigation

### Phase 2: Enhanced Components
- Redesign MeetingCard component
- Add filtering and search
- Implement date grouping
- Add loading states

### Phase 3: Polish and Optimization
- Add animations and transitions
- Optimize performance
- Add accessibility features
- Implement advanced filtering

### Migration Strategy
- Maintain existing API contract
- Preserve all current functionality
- Gradual replacement of FullCalendar features
- Fallback to current implementation if needed

## Design Tokens

### Colors
```css
/* Status Colors */
--meeting-upcoming: hsl(210 40% 98%)
--meeting-ongoing: hsl(142 76% 36%)
--meeting-completed: hsl(210 40% 80%)

/* Meeting Type Colors */
--meeting-internal: hsl(0 84% 60%)
--meeting-external: hsl(210 40% 60%)

/* Layout Colors */
--card-background: hsl(0 0% 100% / 0.8)
--card-border: hsl(210 40% 90%)
--section-header: hsl(210 40% 95%)
```

### Typography
```css
--font-title: 1.125rem / 1.5
--font-subtitle: 0.875rem / 1.25
--font-body: 0.75rem / 1.5
--font-caption: 0.625rem / 1.25
```

### Spacing
```css
--card-padding: 1rem
--card-gap: 1rem
--section-gap: 2rem
--filter-gap: 0.5rem
```

This design provides a modern, accessible, and performant solution that addresses all requirements while maintaining the existing functionality and improving the overall user experience.