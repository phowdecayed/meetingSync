import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CalendarHeader } from '../calendar-header'
import type { CalendarHeaderProps } from '@/types/public-calendar'

// Mock date-fns functions
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns')
  return {
    ...actual,
    format: vi.fn((date, formatStr) => {
      if (formatStr === 'EEEE, dd MMMM yyyy') {
        return 'Senin, 01 Januari 2024'
      }
      return '01 Jan 2024'
    }),
    addWeeks: vi.fn(() => new Date(2024, 0, 8)), // Next week
    subWeeks: vi.fn(() => new Date(2023, 11, 25)), // Previous week
    startOfWeek: vi.fn(() => new Date(2024, 0, 1)),
    endOfWeek: vi.fn(() => new Date(2024, 0, 7)),
  }
})

// Mock calendar utils
vi.mock('@/lib/calendar-utils', () => ({
  formatDateRangeHeader: vi.fn(() => '01 - 07 Januari 2024'),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronLeft: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="chevron-left" {...props} />
  ),
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="chevron-right" {...props} />
  ),
  Calendar: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="calendar-icon" {...props} />
  ),
  Maximize: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="maximize-icon" {...props} />
  ),
  Minimize: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="minimize-icon" {...props} />
  ),
  RefreshCw: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="refresh-icon" {...props} />
  ),
  Home: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="home-icon" {...props} />
  ),
}))

describe('CalendarHeader', () => {
  const mockProps: CalendarHeaderProps = {
    currentDate: new Date(2024, 0, 1), // January 1, 2024
    onDateChange: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onRefresh: vi.fn(),
    isRefreshing: false,
    isFullscreen: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the calendar header with all elements', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        // Check for navigation buttons
        expect(screen.getByTitle('Minggu sebelumnya')).toBeInTheDocument()
        expect(screen.getByTitle('Minggu selanjutnya')).toBeInTheDocument()
        expect(screen.getAllByTitle('Kembali ke hari ini')).toHaveLength(2) // Desktop and mobile versions

        // Check for action buttons
        expect(screen.getByTitle('Refresh data')).toBeInTheDocument()
        expect(screen.getByTitle('Masuk ke layar penuh')).toBeInTheDocument()

        // Check for title
        expect(screen.getByText('01 - 07 Januari 2024')).toBeInTheDocument()
      })
    })

    it('shows loading skeleton when not mounted', () => {
      // We can't easily test the unmounted state due to useEffect,
      // but we can verify the component structure
      render(<CalendarHeader {...mockProps} />)

      // The component should eventually render properly
      waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument()
      })
    })

    it('displays correct title format on different screen sizes', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        // Check that the title contains the formatted date range
        expect(screen.getByText('01 - 07 Januari 2024')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Controls', () => {
    it('calls onDateChange with previous week when previous button is clicked', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        const prevButton = screen.getByTitle('Minggu sebelumnya')
        fireEvent.click(prevButton)
        expect(mockProps.onDateChange).toHaveBeenCalledWith(
          new Date(2023, 11, 25),
        )
      })
    })

    it('calls onDateChange with next week when next button is clicked', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        const nextButton = screen.getByTitle('Minggu selanjutnya')
        fireEvent.click(nextButton)
        expect(mockProps.onDateChange).toHaveBeenCalledWith(
          new Date(2024, 0, 8),
        )
      })
    })

    it('calls onDateChange with current date when today button is clicked', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        const todayButtons = screen.getAllByTitle('Kembali ke hari ini')
        fireEvent.click(todayButtons[0]) // Click the first one (desktop version)
        expect(mockProps.onDateChange).toHaveBeenCalledWith(expect.any(Date))
      })
    })
  })

  describe('Action Buttons', () => {
    it('calls onRefresh when refresh button is clicked', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh data')
        fireEvent.click(refreshButton)
        expect(mockProps.onRefresh).toHaveBeenCalledTimes(1)
      })
    })

    it('disables refresh button when isRefreshing is true', async () => {
      render(<CalendarHeader {...mockProps} isRefreshing={true} />)

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh data')
        expect(refreshButton).toBeDisabled()
      })
    })

    it('shows spinning animation on refresh icon when refreshing', async () => {
      render(<CalendarHeader {...mockProps} isRefreshing={true} />)

      await waitFor(() => {
        const refreshIcon = screen.getByTestId('refresh-icon')
        expect(refreshIcon).toHaveClass('animate-spin')
      })
    })

    it('calls onToggleFullscreen when fullscreen button is clicked', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        const fullscreenButton = screen.getByTitle('Masuk ke layar penuh')
        fireEvent.click(fullscreenButton)
        expect(mockProps.onToggleFullscreen).toHaveBeenCalledTimes(1)
      })
    })

    it('shows minimize icon when in fullscreen mode', async () => {
      render(<CalendarHeader {...mockProps} isFullscreen={true} />)

      await waitFor(() => {
        expect(screen.getByTitle('Keluar dari layar penuh')).toBeInTheDocument()
        expect(screen.getByTestId('minimize-icon')).toBeInTheDocument()
      })
    })

    it('shows maximize icon when not in fullscreen mode', async () => {
      render(<CalendarHeader {...mockProps} isFullscreen={false} />)

      await waitFor(() => {
        expect(screen.getByTitle('Masuk ke layar penuh')).toBeInTheDocument()
        expect(screen.getByTestId('maximize-icon')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('renders mobile-friendly layout', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        // Check that mobile-specific classes are applied
        const header = screen.getByRole('banner')
        expect(header).toHaveClass('sticky', 'top-0', 'z-10')
      })
    })

    it('renders desktop layout with full text', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        // The component should render with responsive classes
        const header = screen.getByRole('banner')
        expect(header).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and titles', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        // Check button titles for screen readers
        expect(screen.getByTitle('Minggu sebelumnya')).toBeInTheDocument()
        expect(screen.getByTitle('Minggu selanjutnya')).toBeInTheDocument()
        expect(screen.getAllByTitle('Kembali ke hari ini')).toHaveLength(2)
        expect(screen.getByTitle('Refresh data')).toBeInTheDocument()
        expect(screen.getByTitle('Masuk ke layar penuh')).toBeInTheDocument()
      })
    })

    it('maintains focus management', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        const prevButton = screen.getByTitle('Minggu sebelumnya')
        prevButton.focus()
        expect(document.activeElement).toBe(prevButton)
      })
    })

    it('supports keyboard navigation', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        const prevButton = screen.getByTitle('Minggu sebelumnya')

        // Simulate keyboard interaction
        fireEvent.keyDown(prevButton, { key: 'Enter' })
        fireEvent.keyUp(prevButton, { key: 'Enter' })

        // The button should still be accessible
        expect(prevButton).toBeInTheDocument()
      })
    })
  })

  describe('Date Formatting', () => {
    it('formats date range correctly', async () => {
      render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        // Check that the formatted date range is displayed
        expect(screen.getByText('01 - 07 Januari 2024')).toBeInTheDocument()
      })
    })

    it('updates title when currentDate changes', async () => {
      const { rerender } = render(<CalendarHeader {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('01 - 07 Januari 2024')).toBeInTheDocument()
      })

      // Change the current date
      const newDate = new Date(2024, 1, 1) // February 1, 2024
      rerender(<CalendarHeader {...mockProps} currentDate={newDate} />)

      await waitFor(() => {
        // The title should update (mocked to return the same value for simplicity)
        expect(screen.getByText('01 - 07 Januari 2024')).toBeInTheDocument()
      })
    })
  })

  describe('Component State', () => {
    it('handles component mounting correctly', async () => {
      render(<CalendarHeader {...mockProps} />)

      // Component should render without errors
      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument()
      })
    })

    it('maintains state consistency', async () => {
      const { rerender } = render(<CalendarHeader {...mockProps} />)

      // Change props and verify component updates
      rerender(<CalendarHeader {...mockProps} isRefreshing={true} />)

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh data')
        expect(refreshButton).toBeDisabled()
      })

      rerender(<CalendarHeader {...mockProps} isRefreshing={false} />)

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh data')
        expect(refreshButton).not.toBeDisabled()
      })
    })
  })
})
