'use client'

import { useState, memo } from 'react'
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDateSection } from '@/lib/calendar-utils'
import type { DateSectionProps } from '@/types/public-calendar'

const DateSection = memo(function DateSection({
  date,
  meetingCount,
  children,
  collapsible = true,
  defaultExpanded = true,
}: DateSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded)
    }
  }

  const formattedDate = formatDateSection(date)

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div
        className={cn(
          'bg-muted/50 flex items-center justify-between gap-4 rounded-lg border p-4 backdrop-blur-sm',
          'transition-all duration-200 ease-in-out',
          collapsible && 'hover:bg-muted/70 cursor-pointer',
          !collapsible && 'cursor-default',
        )}
        onClick={handleToggleExpanded}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            handleToggleExpanded()
          }
        }}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-controls={
          collapsible ? `date-section-${date.toISOString()}` : undefined
        }
      >
        {/* Left side - Date and meeting count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-5 w-5" />
            <h2 className="text-foreground text-lg font-semibold">
              {formattedDate}
            </h2>
          </div>

          <Badge variant="secondary" className="text-xs font-medium">
            {meetingCount} {meetingCount === 1 ? 'rapat' : 'rapat'}
          </Badge>
        </div>

        {/* Right side - Collapse/Expand button */}
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            aria-label={isExpanded ? 'Sembunyikan rapat' : 'Tampilkan rapat'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Section Content */}
      <div
        id={collapsible ? `date-section-${date.toISOString()}` : undefined}
        className={cn(
          'transition-all duration-300 ease-in-out',
          isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
          !isExpanded && 'h-0 overflow-hidden',
        )}
        aria-hidden={collapsible ? !isExpanded : false}
      >
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  )
})

export { DateSection }
export default DateSection
