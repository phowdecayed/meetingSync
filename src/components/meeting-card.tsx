'use client'

import { useState, memo, useMemo, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  User,
  Video,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MeetingCardProps } from '@/types/public-calendar'
import {
  formatMeetingTime,
  formatMeetingDate,
  formatDuration,
  formatMeetingId,
  getStatusBadgeVariant,
  getTypeBadgeVariant,
  getMeetingColorClasses,
  getTimeRemainingText,
  truncateText,
  getMaxDescriptionLength,
} from '@/lib/calendar-utils'

const MeetingCard = memo(function MeetingCard({
  meeting,
  compact = false,
  showDate = false,
  viewMode = 'grid',
}: MeetingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Memoize expensive calculations
  const maxDescriptionLength = useMemo(() => 
    compact ? 60 : getMaxDescriptionLength('desktop'), 
    [compact]
  )
  
  const shouldTruncate = useMemo(() =>
    meeting.description && meeting.description.length > maxDescriptionLength,
    [meeting.description, maxDescriptionLength]
  )
  
  const displayDescription = useMemo(() =>
    shouldTruncate && !isExpanded
      ? truncateText(meeting.description!, maxDescriptionLength)
      : meeting.description,
    [shouldTruncate, isExpanded, meeting.description, maxDescriptionLength]
  )

  // Memoize color classes based on meeting status
  const colorClasses = useMemo(() => getMeetingColorClasses(meeting), [meeting.status])

  // Memoize formatted values
  const duration = useMemo(() => 
    meeting.duration ? formatDuration(meeting.duration) : null, 
    [meeting.duration]
  )
  
  const timeDisplay = useMemo(() => 
    formatMeetingTime(meeting.start, meeting.end), 
    [meeting.start, meeting.end]
  )
  
  const dateDisplay = useMemo(() => 
    showDate ? formatMeetingDate(meeting.start) : null, 
    [showDate, meeting.start]
  )
  
  const timeRemaining = useMemo(() => 
    getTimeRemainingText(meeting.start, meeting.end), 
    [meeting.start, meeting.end]
  )

  // Memoize card size classes
  const cardSizeClasses = useMemo(() => cn(
    'transition-all duration-300 ease-in-out hover:shadow-lg',
    {
      'h-auto min-h-[120px]': compact || viewMode === 'compact',
      'h-auto min-h-[160px]': !compact && viewMode === 'grid',
      'h-auto min-h-[100px]': viewMode === 'list',
    },
  ), [compact, viewMode])

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  return (
    <Card
      className={cn(
        cardSizeClasses,
        colorClasses.background,
        'border-l-4',
        colorClasses.border,
        'group cursor-pointer backdrop-blur-sm hover:scale-[1.02]',
      )}
      role="article"
      aria-labelledby={`meeting-title-${meeting.id}`}
      aria-describedby={`meeting-details-${meeting.id}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          // Handle card interaction if needed
        }
      }}
    >
      <CardHeader className={cn('pb-2', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              id={`meeting-title-${meeting.id}`}
              className={cn(
                'text-foreground group-hover:text-primary leading-tight font-bold transition-colors',
                compact ? 'text-sm' : 'text-base',
                'truncate',
              )}
            >
              {meeting.title}
            </h3>

            {/* Time and Duration Display */}
            <div className="mt-1 flex items-center gap-2">
              <div className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span
                  className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}
                >
                  {timeDisplay}
                </span>
              </div>

              {duration && (
                <div className="text-muted-foreground flex items-center gap-1">
                  <span className="text-xs">•</span>
                  <span
                    className={cn(
                      'text-muted-foreground',
                      compact ? 'text-xs' : 'text-sm',
                    )}
                  >
                    {duration}
                  </span>
                </div>
              )}
            </div>

            {/* Date Display (if showDate is true) */}
            {dateDisplay && (
              <div className="text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className={cn(compact ? 'text-xs' : 'text-sm')}>
                  {dateDisplay}
                </span>
              </div>
            )}

            {/* Time Remaining Display */}
            <div
              className={cn(
                'mt-1 font-medium',
                colorClasses.text,
                compact ? 'text-xs' : 'text-sm',
              )}
            >
              {timeRemaining}
            </div>
          </div>

          {/* Status and Type Badges */}
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant={getStatusBadgeVariant(meeting.status)}
              className={cn(
                'text-xs font-medium',
                compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
              )}
            >
              {meeting.status}
            </Badge>
            <Badge
              variant={getTypeBadgeVariant(meeting.meetingType)}
              className={cn(
                'text-xs capitalize',
                compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
              )}
            >
              {meeting.meetingType}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0', compact ? 'px-3 pb-3' : 'px-4 pb-4')}>
        {/* Meeting Details */}
        <div className="space-y-2" id={`meeting-details-${meeting.id}`}>
          {/* Description */}
          {meeting.description && (
            <div className="space-y-1">
              <p
                className={cn(
                  'text-muted-foreground leading-relaxed',
                  compact ? 'text-xs' : 'text-sm',
                )}
              >
                {displayDescription}
              </p>

              {/* Expand/Collapse Button for Description */}
              {shouldTruncate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleExpanded}
                  className="text-primary hover:text-primary/80 h-auto p-0 text-xs font-medium"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-3 w-3" />
                      Tampilkan Lebih Sedikit
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3 w-3" />
                      Tampilkan Lebih Banyak
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Meeting Details Grid */}
          <div className="grid gap-1.5">
            {/* Organizer */}
            <div className="flex items-center gap-2">
              <User className="text-muted-foreground h-3 w-3 flex-shrink-0" />
              <span
                className={cn(
                  'text-muted-foreground truncate',
                  compact ? 'text-xs' : 'text-sm',
                )}
              >
                <span className="font-medium">Penanggung Jawab:</span>
                <span className="ml-1">{meeting.organizerName}</span>
              </span>
            </div>

            {/* Meeting Room (for internal meetings) */}
            {meeting.meetingRoom && meeting.meetingType === 'internal' && (
              <div className="flex items-center gap-2">
                <MapPin className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                <span
                  className={cn(
                    'text-muted-foreground truncate',
                    compact ? 'text-xs' : 'text-sm',
                  )}
                >
                  <span className="font-medium">Ruang Rapat:</span>
                  <span className="ml-1">{meeting.meetingRoom}</span>
                </span>
              </div>
            )}

            {/* Meeting ID (for external meetings) */}
            {meeting.meetingId && meeting.meetingType === 'external' && (
              <div className="flex items-center gap-2">
                <Video className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                <span
                  className={cn(
                    'text-muted-foreground font-mono',
                    compact ? 'text-xs' : 'text-sm',
                  )}
                >
                  <span className="font-sans font-medium">Meeting ID:</span>
                  <span className="ml-1">
                    {formatMeetingId(meeting.meetingId)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export { MeetingCard }
export default MeetingCard