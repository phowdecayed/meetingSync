'use client'

import { useState, useEffect, memo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Maximize,
  Minimize,
  RefreshCw,
  Home,
} from 'lucide-react'
import { addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { formatDateRangeHeader } from '@/lib/calendar-utils'
import type { CalendarHeaderProps } from '@/types/public-calendar'
import { cn } from '@/lib/utils'

const CalendarHeader = memo(function CalendarHeader({
  currentDate,
  onDateChange,
  onToggleFullscreen,
  onRefresh,
  isRefreshing,
  isFullscreen,
}: CalendarHeaderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handlePreviousWeek = () => {
    const previousWeek = subWeeks(currentDate, 1)
    onDateChange(previousWeek)
  }

  const handleNextWeek = () => {
    const nextWeek = addWeeks(currentDate, 1)
    onDateChange(nextWeek)
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const getWeekRange = () => {
    const weekStart = startOfWeek(currentDate, { locale: id })
    const weekEnd = endOfWeek(currentDate, { locale: id })
    return formatDateRangeHeader(weekStart, weekEnd)
  }

  const getCurrentWeekTitle = () => {
    return getWeekRange()
  }

  if (!mounted) {
    return (
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex h-16 items-center justify-between border-b backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="bg-muted h-8 w-32 animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted h-9 w-9 animate-pulse rounded" />
          <div className="bg-muted h-9 w-9 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <header
      className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-16 items-center justify-between border-b backdrop-blur"
      role="banner"
      aria-label="Calendar header with navigation and controls"
    >
      {/* Left section - Navigation and Title */}
      <div
        className="flex items-center gap-2 px-4 sm:gap-4"
        role="group"
        aria-label="Date navigation and title"
      >
        {/* Navigation Controls */}
        <nav
          className="flex items-center gap-1"
          role="navigation"
          aria-label="Week navigation"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousWeek}
            className="focus:ring-ring h-8 w-8 focus:ring-2 focus:ring-offset-2 focus:outline-none sm:h-9 sm:w-9"
            aria-label="Navigasi ke minggu sebelumnya"
            title="Minggu sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="focus:ring-ring hidden px-3 focus:ring-2 focus:ring-offset-2 focus:outline-none sm:inline-flex"
            aria-label="Kembali ke minggu ini"
            title="Kembali ke hari ini"
          >
            <Home className="mr-1 h-3 w-3" aria-hidden="true" />
            Hari Ini
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleToday}
            className="focus:ring-ring h-8 w-8 focus:ring-2 focus:ring-offset-2 focus:outline-none sm:hidden"
            aria-label="Kembali ke minggu ini"
            title="Kembali ke hari ini"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNextWeek}
            className="focus:ring-ring h-8 w-8 focus:ring-2 focus:ring-offset-2 focus:outline-none sm:h-9 sm:w-9"
            aria-label="Navigasi ke minggu selanjutnya"
            title="Minggu selanjutnya"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>

        {/* Title */}
        <div className="flex items-center gap-2" role="heading" aria-level={1}>
          <Calendar
            className="text-muted-foreground h-5 w-5"
            aria-hidden="true"
          />
          <h1
            className="text-lg font-semibold sm:text-xl"
            id="calendar-title"
            aria-live="polite"
          >
            <span className="hidden sm:inline">Kalender Rapat - </span>
            <span
              className="text-muted-foreground sm:text-foreground text-sm font-medium sm:text-base sm:font-semibold"
              aria-label={`Menampilkan minggu ${getCurrentWeekTitle()}`}
            >
              {getCurrentWeekTitle()}
            </span>
          </h1>
        </div>
      </div>

      {/* Right section - Action buttons */}
      <div
        className="flex items-center gap-2 px-4"
        role="group"
        aria-label="Calendar actions"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            'h-8 w-8 sm:h-9 sm:w-9',
            'bg-background/50 backdrop-blur-sm',
            'hover:bg-accent/50',
            'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
          )}
          aria-label={
            isRefreshing
              ? 'Sedang memuat ulang data'
              : 'Muat ulang data kalender'
          }
          title="Refresh data"
        >
          <RefreshCw
            className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
            aria-hidden="true"
          />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onToggleFullscreen}
          className={cn(
            'h-8 w-8 sm:h-9 sm:w-9',
            'bg-background/50 backdrop-blur-sm',
            'hover:bg-accent/50',
            'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
          )}
          aria-label={
            isFullscreen
              ? 'Keluar dari mode layar penuh'
              : 'Masuk ke mode layar penuh'
          }
          title={
            isFullscreen ? 'Keluar dari layar penuh' : 'Masuk ke layar penuh'
          }
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Maximize className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </header>
  )
})

export { CalendarHeader }
export default CalendarHeader
