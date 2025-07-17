'use client'

import { useState, useEffect, memo, useCallback } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useDebounce } from '@/hooks/use-debounce'
import {
  MeetingType,
  MeetingStatus,
  CalendarFiltersProps,
} from '@/types/public-calendar'

const CalendarFilters = memo(function CalendarFilters({
  searchTerm,
  onSearchChange,
  selectedTypes,
  onTypeFilter,
  selectedStatuses,
  onStatusFilter,
  onClearFilters,
}: CalendarFiltersProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  // Debounce search input
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300)

  // Update parent component when debounced search term changes
  useEffect(() => {
    onSearchChange(debouncedSearchTerm)
  }, [debouncedSearchTerm, onSearchChange])

  // Sync local search term with prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  const meetingTypes: { value: MeetingType; label: string }[] = [
    { value: 'internal', label: 'Internal' },
    { value: 'external', label: 'External' },
  ]

  const meetingStatuses: {
    value: MeetingStatus
    label: string
    variant: 'default' | 'secondary' | 'outline'
  }[] = [
    { value: 'Akan Datang', label: 'Akan Datang', variant: 'secondary' },
    {
      value: 'Sedang Berlangsung',
      label: 'Sedang Berlangsung',
      variant: 'default',
    },
    { value: 'Selesai', label: 'Selesai', variant: 'outline' },
  ]

  const handleTypeToggle = (type: MeetingType) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type]
    onTypeFilter(newTypes)
  }

  const handleStatusToggle = (status: MeetingStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status]
    onStatusFilter(newStatuses)
  }

  const hasActiveFilters =
    localSearchTerm.length > 0 ||
    selectedTypes.length > 0 ||
    selectedStatuses.length > 0

  const clearAllFilters = () => {
    setLocalSearchTerm('')
    onClearFilters()
  }

  return (
    <div 
      className="space-y-4 rounded-lg bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-gray-800/80"
      role="search"
      aria-label="Meeting search and filters"
    >
      {/* Search Input */}
      <div className="relative">
        <label htmlFor="meeting-search" className="sr-only">
          Search meetings by title, description, or organizer
        </label>
        <Search 
          className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" 
          aria-hidden="true"
        />
        <Input
          id="meeting-search"
          type="text"
          placeholder="Search meetings..."
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          className="pr-10 pl-10"
          aria-describedby="search-help"
        />
        <div id="search-help" className="sr-only">
          Search across meeting titles, descriptions, and organizer names
        </div>
        {localSearchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => setLocalSearchTerm('')}
            aria-label="Clear search"
            title="Clear search"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Filter Toggle Button (Mobile) */}
      <div className="flex items-center justify-between md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className="flex items-center gap-2"
          aria-expanded={isFiltersExpanded}
          aria-controls="mobile-filters-content"
          aria-label={`${isFiltersExpanded ? 'Hide' : 'Show'} filter options`}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filters
          {hasActiveFilters && (
            <Badge
              variant="destructive"
              className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
              aria-label={`${selectedTypes.length + selectedStatuses.length} active filters`}
            >
              {(selectedTypes.length + selectedStatuses.length).toString()}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground"
            aria-label="Clear all active filters"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filters Content */}
      <div
        id="mobile-filters-content"
        className={`space-y-4 ${isFiltersExpanded ? 'block' : 'hidden'} md:block`}
        aria-hidden={!isFiltersExpanded}
      >
        {/* Meeting Type Filters */}
        <div className="space-y-2">
          <h3 className="text-foreground text-sm font-medium">Meeting Type</h3>
          <div className="flex flex-wrap gap-2">
            {meetingTypes.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type.value}`}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => handleTypeToggle(type.value)}
                />
                <label
                  htmlFor={`type-${type.value}`}
                  className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Meeting Status Filters */}
        <div className="space-y-2">
          <h3 className="text-foreground text-sm font-medium">Status</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by meeting status">
            {meetingStatuses.map((status) => (
              <Badge
                key={status.value}
                variant={
                  selectedStatuses.includes(status.value)
                    ? status.variant
                    : 'outline'
                }
                className={`cursor-pointer transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  selectedStatuses.includes(status.value)
                    ? 'ring-ring ring-2 ring-offset-2'
                    : 'hover:bg-accent'
                }`}
                onClick={() => handleStatusToggle(status.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleStatusToggle(status.value)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={selectedStatuses.includes(status.value)}
                aria-label={`${selectedStatuses.includes(status.value) ? 'Remove' : 'Add'} ${status.label} filter`}
              >
                {status.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Clear Filters Button (Desktop) */}
        {hasActiveFilters && (
          <div className="hidden md:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-2 h-4 w-4" />
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {selectedTypes.map((type) => (
            <Badge
              key={`active-type-${type}`}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleTypeToggle(type)}
            >
              {type}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {selectedStatuses.map((status) => (
            <Badge
              key={`active-status-${status}`}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleStatusToggle(status)}
            >
              {status}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
})

export { CalendarFilters }
export default CalendarFilters
