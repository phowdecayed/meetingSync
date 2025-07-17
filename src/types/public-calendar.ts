// Enhanced types for the public calendar layout system

export type MeetingStatus = 'Akan Datang' | 'Sedang Berlangsung' | 'Selesai'

export type MeetingType = 'internal' | 'external'

export type PublicMeeting = {
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

export type ViewMode = 'grid' | 'list' | 'compact'

export type GroupingMode = 'date' | 'status' | 'type'

export type DateRange = 'today' | 'week' | 'month'

export type FilterState = {
  search: string
  types: MeetingType[]
  statuses: MeetingStatus[]
  dateRange: DateRange
}

export type LayoutConfig = {
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

export type ResponsiveBreakpoint = 'mobile' | 'tablet' | 'desktop'

export type CalendarHeaderProps = {
  currentDate: Date
  onDateChange: (date: Date) => void
  onToggleFullscreen: () => void
  onRefresh: () => void
  isRefreshing: boolean
  isFullscreen: boolean
}

export type CalendarFiltersProps = {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedTypes: MeetingType[]
  onTypeFilter: (types: MeetingType[]) => void
  selectedStatuses: MeetingStatus[]
  onStatusFilter: (statuses: MeetingStatus[]) => void
  onClearFilters: () => void
}

export type CalendarGridProps = {
  meetings: PublicMeeting[]
  groupBy: GroupingMode
  loading: boolean
  viewMode: ViewMode
  layoutConfig: LayoutConfig
}

export type MeetingCardProps = {
  meeting: PublicMeeting
  compact?: boolean
  showDate?: boolean
  viewMode?: ViewMode
}

export type DateSectionProps = {
  date: Date
  meetingCount: number
  children?: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
}

export type LoadingState = 'idle' | 'loading' | 'refreshing' | 'error'

export type CalendarError = {
  type: 'network' | 'parsing' | 'unknown'
  message: string
  timestamp: Date
}

export type PerformanceMetrics = {
  renderTime: number
  filterTime: number
  dataSize: number
  lastUpdate: number
}
