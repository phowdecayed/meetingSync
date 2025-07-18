'use client'

import { useMemo, memo } from 'react'
import { parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { DateSection } from '@/components/date-section'
import MeetingCard from '@/components/meeting-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Search } from 'lucide-react'
import type { CalendarGridProps } from '@/types/public-calendar'
import {
  groupMeetingsByCustomField,
  sortMeetingsByStartTime,
  shouldShowCompactView,
} from '@/lib/calendar-utils'

const CalendarGrid = memo(function CalendarGrid({
  meetings,
  groupBy = 'date',
  loading = false,
  viewMode = 'grid',
  layoutConfig,
}: CalendarGridProps) {
  // Group and sort meetings based on groupBy prop
  const groupedMeetings = useMemo(() => {
    if (loading || meetings.length === 0) return {}

    const grouped = groupMeetingsByCustomField(meetings, groupBy)

    // Sort meetings within each group by start time
    Object.keys(grouped).forEach((key) => {
      grouped[key] = sortMeetingsByStartTime(grouped[key])
    })

    return grouped
  }, [meetings, groupBy, loading])

  // Get sorted group keys for consistent ordering
  const sortedGroupKeys = useMemo(() => {
    const keys = Object.keys(groupedMeetings)

    if (groupBy === 'date') {
      // Sort date keys chronologically
      return keys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    } else if (groupBy === 'status') {
      // Sort status keys by priority
      const statusOrder = ['Sedang Berlangsung', 'Akan Datang', 'Selesai']
      return keys.sort(
        (a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b),
      )
    } else {
      // Sort alphabetically for other groupings
      return keys.sort()
    }
  }, [groupedMeetings, groupBy])

  // Calculate responsive grid classes
  const gridClasses = useMemo(() => {
    const baseClasses = 'grid gap-4 w-full'

    // Responsive column classes based on layoutConfig
    const columnClasses = cn(
      // Mobile: 1 column
      `grid-cols-${layoutConfig.columns.mobile}`,
      // Tablet: 2-3 columns
      `md:grid-cols-${layoutConfig.columns.tablet}`,
      // Desktop: 3-4 columns
      `lg:grid-cols-${layoutConfig.columns.desktop}`,
    )

    return cn(baseClasses, columnClasses)
  }, [layoutConfig])

  // Render loading skeleton
  if (loading) {
    return (
      <div className="space-y-6" data-testid="loading-skeleton">
        {/* Loading skeleton for date sections */}
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            {/* Section header skeleton */}
            <div className="bg-muted/50 flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>

            {/* Meeting cards skeleton */}
            <div className={gridClasses}>
              {Array.from({ length: layoutConfig.columns.desktop }).map(
                (_, cardIndex) => (
                  <Card key={cardIndex} className="h-auto min-h-[160px]">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-12" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-3/5" />
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render empty state
  if (!loading && meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="bg-muted mb-4 rounded-full p-6">
          <Calendar className="text-muted-foreground h-12 w-12" />
        </div>
        <h3 className="text-foreground mb-2 text-lg font-semibold">
          Tidak Ada Rapat
        </h3>
        <p className="text-muted-foreground max-w-md">
          Tidak ada rapat yang ditemukan untuk periode waktu yang dipilih. Coba
          ubah filter atau rentang tanggal untuk melihat rapat lainnya.
        </p>
      </div>
    )
  }

  // Render no results state (when meetings exist but none match filters)
  if (!loading && meetings.length > 0 && sortedGroupKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="bg-muted mb-4 rounded-full p-6">
          <Search className="text-muted-foreground h-12 w-12" />
        </div>
        <h3 className="text-foreground mb-2 text-lg font-semibold">
          Tidak Ada Hasil
        </h3>
        <p className="text-muted-foreground max-w-md">
          Tidak ada rapat yang sesuai dengan filter yang dipilih. Coba ubah
          kriteria pencarian atau hapus beberapa filter.
        </p>
      </div>
    )
  }

  // Helper function to get group date for DateSection
  const getGroupDate = (key: string, groupBy: string): Date => {
    if (groupBy === 'date') {
      return parseISO(key)
    }
    // For non-date groupings, use today's date
    return new Date()
  }

  // Render main content
  return (
    <div className="space-y-6">
      {sortedGroupKeys.map((groupKey, sectionIndex) => {
        const groupMeetings = groupedMeetings[groupKey]
        const groupDate = getGroupDate(groupKey, groupBy)
        const shouldUseCompactView =
          shouldShowCompactView('mobile') && viewMode !== 'grid'

        return (
          <div
            key={groupKey}
            className="animate-in fade-in-0 slide-in-from-bottom-4"
            style={{
              animationDelay: `${sectionIndex * 100}ms`,
              animationDuration: '500ms',
              animationFillMode: 'both',
            }}
          >
            <DateSection
              date={groupDate}
              meetingCount={groupMeetings.length}
              collapsible={true}
              defaultExpanded={true}
            >
              <div className={gridClasses}>
                {groupMeetings.map((meeting, cardIndex) => (
                  <div
                    key={meeting.id}
                    className="animate-in fade-in-0 slide-in-from-bottom-2"
                    style={{
                      animationDelay: `${sectionIndex * 100 + cardIndex * 50}ms`,
                      animationDuration: '400ms',
                      animationFillMode: 'both',
                    }}
                  >
                    <MeetingCard
                      meeting={meeting}
                      compact={
                        shouldUseCompactView || layoutConfig.cardSize.compact
                      }
                      showDate={groupBy !== 'date'}
                      viewMode={viewMode}
                    />
                  </div>
                ))}
              </div>
            </DateSection>
          </div>
        )
      })}
    </div>
  )
})

export { CalendarGrid }
export default CalendarGrid
