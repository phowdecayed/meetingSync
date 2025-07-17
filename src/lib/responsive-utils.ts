// Responsive layout utilities for the public calendar system

import type {
  ResponsiveBreakpoint,
  LayoutConfig,
  ViewMode,
} from '@/types/public-calendar'

/**
 * Breakpoint definitions in pixels
 */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
} as const

/**
 * Get the current responsive breakpoint based on window width
 */
export const getCurrentBreakpoint = (): ResponsiveBreakpoint => {
  if (typeof window === 'undefined') return 'desktop'

  const width = window.innerWidth

  if (width < BREAKPOINTS.mobile) return 'mobile'
  if (width < BREAKPOINTS.tablet) return 'tablet'
  return 'desktop'
}

/**
 * Get breakpoint from width value
 */
export const getBreakpointFromWidth = (width: number): ResponsiveBreakpoint => {
  if (width < BREAKPOINTS.mobile) return 'mobile'
  if (width < BREAKPOINTS.tablet) return 'tablet'
  return 'desktop'
}

/**
 * Check if current viewport matches a specific breakpoint
 */
export const isBreakpoint = (breakpoint: ResponsiveBreakpoint): boolean => {
  if (typeof window === 'undefined') return false

  const current = getCurrentBreakpoint()
  return current === breakpoint
}

/**
 * Check if current viewport is at or above a specific breakpoint
 */
export const isBreakpointUp = (breakpoint: ResponsiveBreakpoint): boolean => {
  if (typeof window === 'undefined') return false

  const breakpointOrder: ResponsiveBreakpoint[] = [
    'mobile',
    'tablet',
    'desktop',
  ]
  const current = getCurrentBreakpoint()
  const currentIndex = breakpointOrder.indexOf(current)
  const targetIndex = breakpointOrder.indexOf(breakpoint)

  return currentIndex >= targetIndex
}

/**
 * Check if current viewport is below a specific breakpoint
 */
export const isBreakpointDown = (breakpoint: ResponsiveBreakpoint): boolean => {
  if (typeof window === 'undefined') return false

  const breakpointOrder: ResponsiveBreakpoint[] = [
    'mobile',
    'tablet',
    'desktop',
  ]
  const current = getCurrentBreakpoint()
  const currentIndex = breakpointOrder.indexOf(current)
  const targetIndex = breakpointOrder.indexOf(breakpoint)

  return currentIndex < targetIndex
}

/**
 * Get the number of columns for the current breakpoint
 */
export const getColumnsForBreakpoint = (
  breakpoint: ResponsiveBreakpoint,
  config: LayoutConfig,
): number => {
  return config.columns[breakpoint]
}

/**
 * Calculate optimal grid columns based on container width and minimum card width
 */
export const calculateOptimalColumns = (
  containerWidth: number,
  minCardWidth: number = 280,
  gap: number = 16,
): number => {
  if (containerWidth < minCardWidth) return 1

  // Calculate how many cards can fit with gaps
  const availableWidth = containerWidth - gap
  const cardWithGap = minCardWidth + gap
  const maxColumns = Math.floor(availableWidth / cardWithGap)

  return Math.max(1, maxColumns)
}

/**
 * Calculate card width based on container width and number of columns
 */
export const calculateCardWidth = (
  containerWidth: number,
  columns: number,
  gap: number = 16,
): number => {
  const totalGap = (columns - 1) * gap
  return Math.floor((containerWidth - totalGap) / columns)
}

/**
 * Get CSS Grid template columns string
 */
export const getGridTemplateColumns = (columns: number): string => {
  return `repeat(${columns}, 1fr)`
}

/**
 * Get responsive gap size based on breakpoint
 */
export const getResponsiveGap = (breakpoint: ResponsiveBreakpoint): number => {
  switch (breakpoint) {
    case 'mobile':
      return 12
    case 'tablet':
      return 16
    case 'desktop':
      return 20
    default:
      return 16
  }
}

/**
 * Get responsive padding based on breakpoint
 */
export const getResponsivePadding = (
  breakpoint: ResponsiveBreakpoint,
): number => {
  switch (breakpoint) {
    case 'mobile':
      return 16
    case 'tablet':
      return 24
    case 'desktop':
      return 32
    default:
      return 24
  }
}

/**
 * Get optimal view mode based on breakpoint and container width
 */
export const getOptimalViewMode = (
  breakpoint: ResponsiveBreakpoint,
  containerWidth?: number,
): ViewMode => {
  if (breakpoint === 'mobile') return 'list'
  if (breakpoint === 'tablet') {
    // If container is narrow on tablet, use compact view
    if (containerWidth && containerWidth < 600) return 'compact'
    return 'grid'
  }
  return 'grid'
}

/**
 * Check if touch interactions should be enabled
 */
export const shouldEnableTouchInteractions = (): boolean => {
  if (typeof window === 'undefined') return false

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Get responsive font sizes
 */
export const getResponsiveFontSizes = (breakpoint: ResponsiveBreakpoint) => {
  const sizes = {
    mobile: {
      title: 'text-base',
      subtitle: 'text-sm',
      body: 'text-xs',
      caption: 'text-xs',
    },
    tablet: {
      title: 'text-lg',
      subtitle: 'text-sm',
      body: 'text-sm',
      caption: 'text-xs',
    },
    desktop: {
      title: 'text-xl',
      subtitle: 'text-base',
      body: 'text-sm',
      caption: 'text-sm',
    },
  }

  return sizes[breakpoint]
}

/**
 * Get responsive spacing classes
 */
export const getResponsiveSpacing = (breakpoint: ResponsiveBreakpoint) => {
  const spacing = {
    mobile: {
      container: 'p-4',
      card: 'p-3',
      section: 'mb-4',
      element: 'mb-2',
    },
    tablet: {
      container: 'p-6',
      card: 'p-4',
      section: 'mb-6',
      element: 'mb-3',
    },
    desktop: {
      container: 'p-8',
      card: 'p-6',
      section: 'mb-8',
      element: 'mb-4',
    },
  }

  return spacing[breakpoint]
}

/**
 * Get maximum description length based on breakpoint and view mode
 */
export const getMaxDescriptionLength = (
  breakpoint: ResponsiveBreakpoint,
  viewMode: ViewMode = 'grid',
): number => {
  const lengths = {
    mobile: {
      grid: 60,
      list: 80,
      compact: 40,
    },
    tablet: {
      grid: 100,
      list: 120,
      compact: 60,
    },
    desktop: {
      grid: 150,
      list: 200,
      compact: 80,
    },
  }

  return lengths[breakpoint][viewMode]
}

/**
 * Check if sidebar should be collapsed based on breakpoint
 */
export const shouldCollapseSidebar = (
  breakpoint: ResponsiveBreakpoint,
): boolean => {
  return breakpoint === 'mobile' || breakpoint === 'tablet'
}

/**
 * Get responsive layout configuration
 */
export const getResponsiveLayoutConfig = (
  breakpoint: ResponsiveBreakpoint,
): Partial<LayoutConfig> => {
  const configs = {
    mobile: {
      columns: { mobile: 1, tablet: 1, desktop: 1 },
      cardSize: {
        compact: true,
        showDescription: true,
        maxDescriptionLength: 60,
      },
    },
    tablet: {
      columns: { mobile: 1, tablet: 2, desktop: 2 },
      cardSize: {
        compact: false,
        showDescription: true,
        maxDescriptionLength: 100,
      },
    },
    desktop: {
      columns: { mobile: 1, tablet: 2, desktop: 3 },
      cardSize: {
        compact: false,
        showDescription: true,
        maxDescriptionLength: 150,
      },
    },
  }

  return configs[breakpoint]
}

/**
 * Create a responsive observer hook utility
 */
export const createResponsiveObserver = (
  callback: (breakpoint: ResponsiveBreakpoint) => void,
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  let currentBreakpoint = getCurrentBreakpoint()

  const handleResize = () => {
    const newBreakpoint = getCurrentBreakpoint()
    if (newBreakpoint !== currentBreakpoint) {
      currentBreakpoint = newBreakpoint
      callback(newBreakpoint)
    }
  }

  window.addEventListener('resize', handleResize)

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize)
  }
}

/**
 * Debounced resize observer
 */
export const createDebouncedResponsiveObserver = (
  callback: (breakpoint: ResponsiveBreakpoint) => void,
  delay: number = 150,
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  let currentBreakpoint = getCurrentBreakpoint()
  let timeoutId: NodeJS.Timeout

  const handleResize = () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      const newBreakpoint = getCurrentBreakpoint()
      if (newBreakpoint !== currentBreakpoint) {
        currentBreakpoint = newBreakpoint
        callback(newBreakpoint)
      }
    }, delay)
  }

  window.addEventListener('resize', handleResize)

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId)
    window.removeEventListener('resize', handleResize)
  }
}

/**
 * Get CSS media query string for breakpoint
 */
export const getMediaQuery = (
  breakpoint: ResponsiveBreakpoint,
  direction: 'up' | 'down' = 'up',
): string => {
  const width = BREAKPOINTS[breakpoint]

  if (direction === 'up') {
    return `(min-width: ${width}px)`
  } else {
    return `(max-width: ${width - 1}px)`
  }
}

/**
 * Check if media query matches
 */
export const matchesMediaQuery = (query: string): boolean => {
  if (typeof window === 'undefined') return false

  return window.matchMedia(query).matches
}

/**
 * Get container max width based on breakpoint
 */
export const getContainerMaxWidth = (
  breakpoint: ResponsiveBreakpoint,
): string => {
  const maxWidths = {
    mobile: '100%',
    tablet: '768px',
    desktop: '1200px',
  }

  return maxWidths[breakpoint]
}

/**
 * Calculate responsive grid areas for complex layouts
 */
export const calculateGridAreas = (
  breakpoint: ResponsiveBreakpoint,
  hasFilters: boolean = true,
  hasHeader: boolean = true,
): string => {
  if (breakpoint === 'mobile') {
    return hasHeader && hasFilters
      ? '"header header" "filters filters" "content content"'
      : hasHeader
        ? '"header header" "content content"'
        : '"content content"'
  }

  if (breakpoint === 'tablet') {
    return hasHeader && hasFilters
      ? '"header header header" "filters content content"'
      : hasHeader
        ? '"header header header" "content content content"'
        : '"content content content"'
  }

  // Desktop
  return hasHeader && hasFilters
    ? '"header header header header" "filters content content content"'
    : hasHeader
      ? '"header header header header" "content content content content"'
      : '"content content content content"'
}

/**
 * Default responsive configuration
 */
export const DEFAULT_RESPONSIVE_CONFIG = {
  minCardWidth: 280,
  maxCardWidth: 400,
  defaultGap: 16,
  defaultPadding: 24,
  touchThreshold: 10, // pixels
  resizeDebounce: 150, // milliseconds
  animationDuration: 200, // milliseconds
} as const
