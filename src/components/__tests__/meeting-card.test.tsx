import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MeetingCard from '../meeting-card'
import type { PublicMeeting } from '@/types/public-calendar'

// Mock the calendar utils
vi.mock('@/lib/calendar-utils', () => ({
  formatMeetingTime: vi.fn((start: string, end: string) => '10:00 - 11:00'),
  formatMeetingDate: vi.fn((date: string) => 'Hari Ini'),
  formatDuration: vi.fn((minutes: number) => `${minutes} menit`),
  formatMeetingId: vi.fn((id: string) => '123 4567 890'),
  getStatusBadgeVariant: vi.fn((status: string) => 'default'),
  getTypeBadgeVariant: vi.fn((type: string) => 'secondary'),
  getMeetingColorClasses: vi.fn(() => ({
    background: 'bg-green-500/20',
    border: 'border-green-500',
    text: 'text-green-700',
  })),
  getTimeRemainingText: vi.fn(() => 'Dimulai dalam 30 menit'),
  truncateText: vi.fn((text: string, maxLength: number) =>
    text.length > maxLength ? text.slice(0, maxLength) + '...' : text,
  ),
  getMaxDescriptionLength: vi.fn(() => 50), // Lower threshold to trigger truncation
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  Clock: () => <div data-testid="clock-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  User: () => <div data-testid="user-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
}))

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => {
    return classes
      .filter(Boolean)
      .map((cls) => {
        if (typeof cls === 'string') return cls
        if (typeof cls === 'object' && cls !== null) {
          return Object.entries(cls)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(' ')
        }
        return ''
      })
      .join(' ')
      .trim()
  },
}))

describe('MeetingCard', () => {
  const mockMeeting: PublicMeeting = {
    id: '1',
    title: 'Team Meeting',
    description:
      'Weekly team sync meeting to discuss project progress and upcoming tasks',
    start: '2024-01-15T10:00:00Z',
    end: '2024-01-15T11:00:00Z',
    organizerName: 'John Doe',
    status: 'Akan Datang',
    meetingType: 'internal',
    meetingRoom: 'Conference Room A',
    duration: 60,
    isToday: true,
    isOngoing: false,
  }

  const mockExternalMeeting: PublicMeeting = {
    ...mockMeeting,
    id: '2',
    title: 'Client Presentation',
    meetingType: 'external',
    meetingId: '12345678901',
    meetingRoom: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders meeting card with basic information', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
      expect(screen.getByTestId('user-icon')).toBeInTheDocument()
    })

    it('renders status and type badges', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      const badges = screen.getAllByTestId('badge')
      expect(badges).toHaveLength(2)
      expect(screen.getByText('Akan Datang')).toBeInTheDocument()
      expect(screen.getByText('internal')).toBeInTheDocument()
    })

    it('displays meeting duration when available', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      expect(screen.getByText('60 menit')).toBeInTheDocument()
    })

    it('displays time remaining information', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      expect(screen.getByText('Dimulai dalam 30 menit')).toBeInTheDocument()
    })
  })

  describe('Description Functionality', () => {
    it('renders full description when not truncated', () => {
      const shortMeeting = {
        ...mockMeeting,
        description: 'Short description',
      }

      render(<MeetingCard meeting={shortMeeting} />)

      expect(screen.getByText('Short description')).toBeInTheDocument()
      expect(
        screen.queryByText('Tampilkan Lebih Banyak'),
      ).not.toBeInTheDocument()
    })

    it('truncates long description and shows expand button', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      expect(screen.getByText('Tampilkan Lebih Banyak')).toBeInTheDocument()
      expect(screen.getByTestId('chevron-down')).toBeInTheDocument()
    })

    it('expands description when expand button is clicked', async () => {
      render(<MeetingCard meeting={mockMeeting} />)

      const expandButton = screen.getByText('Tampilkan Lebih Banyak')
      fireEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('Tampilkan Lebih Sedikit')).toBeInTheDocument()
        expect(screen.getByTestId('chevron-up')).toBeInTheDocument()
      })
    })

    it('collapses description when collapse button is clicked', async () => {
      render(<MeetingCard meeting={mockMeeting} />)

      // First expand
      const expandButton = screen.getByText('Tampilkan Lebih Banyak')
      fireEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('Tampilkan Lebih Sedikit')).toBeInTheDocument()
      })

      // Then collapse
      const collapseButton = screen.getByText('Tampilkan Lebih Sedikit')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        expect(screen.getByText('Tampilkan Lebih Banyak')).toBeInTheDocument()
      })
    })

    it('does not render description section when description is null', () => {
      const meetingWithoutDescription = {
        ...mockMeeting,
        description: null,
      }

      render(<MeetingCard meeting={meetingWithoutDescription} />)

      expect(
        screen.queryByText('Tampilkan Lebih Banyak'),
      ).not.toBeInTheDocument()
    })
  })

  describe('Meeting Type Specific Features', () => {
    it('displays meeting room for internal meetings', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument()
      expect(screen.getByText('Ruang Rapat:')).toBeInTheDocument()
    })

    it('displays meeting ID for external meetings', () => {
      render(<MeetingCard meeting={mockExternalMeeting} />)

      expect(screen.getByText('123 4567 890')).toBeInTheDocument()
      expect(screen.getByTestId('video-icon')).toBeInTheDocument()
      expect(screen.getByText('Meeting ID:')).toBeInTheDocument()
    })

    it('does not display meeting room for external meetings', () => {
      render(<MeetingCard meeting={mockExternalMeeting} />)

      expect(screen.queryByText('Ruang Rapat:')).not.toBeInTheDocument()
      expect(screen.queryByTestId('map-pin-icon')).not.toBeInTheDocument()
    })

    it('does not display meeting ID for internal meetings', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      expect(screen.queryByText('Meeting ID:')).not.toBeInTheDocument()
      expect(screen.queryByTestId('video-icon')).not.toBeInTheDocument()
    })
  })

  describe('Responsive and View Mode Variations', () => {
    it('applies compact styling when compact prop is true', () => {
      render(<MeetingCard meeting={mockMeeting} compact={true} />)

      const cardHeader = screen.getByTestId('card-header')
      expect(cardHeader).toHaveClass('p-3')
    })

    it('applies normal styling when compact prop is false', () => {
      render(<MeetingCard meeting={mockMeeting} compact={false} />)

      const cardHeader = screen.getByTestId('card-header')
      expect(cardHeader).toHaveClass('p-4')
    })

    it('shows date when showDate prop is true', () => {
      render(<MeetingCard meeting={mockMeeting} showDate={true} />)

      expect(screen.getByText('Hari Ini')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    })

    it('does not show date when showDate prop is false', () => {
      render(<MeetingCard meeting={mockMeeting} showDate={false} />)

      expect(screen.queryByTestId('calendar-icon')).not.toBeInTheDocument()
    })

    it('applies correct classes for grid view mode', () => {
      render(<MeetingCard meeting={mockMeeting} viewMode="grid" />)

      const card = screen.getByTestId('card')
      expect(card.className).toContain('min-h-[160px]')
    })

    it('applies correct classes for list view mode', () => {
      render(<MeetingCard meeting={mockMeeting} viewMode="list" />)

      const card = screen.getByTestId('card')
      expect(card.className).toContain('min-h-[100px]')
    })

    it('applies correct classes for compact view mode', () => {
      render(<MeetingCard meeting={mockMeeting} viewMode="compact" />)

      const card = screen.getByTestId('card')
      expect(card.className).toContain('min-h-[120px]')
    })
  })

  describe('Meeting Status Variations', () => {
    it('renders ongoing meeting with correct styling', () => {
      const ongoingMeeting = {
        ...mockMeeting,
        status: 'Sedang Berlangsung' as const,
        isOngoing: true,
      }

      render(<MeetingCard meeting={ongoingMeeting} />)

      expect(screen.getByText('Sedang Berlangsung')).toBeInTheDocument()
    })

    it('renders completed meeting with correct styling', () => {
      const completedMeeting = {
        ...mockMeeting,
        status: 'Selesai' as const,
        isOngoing: false,
      }

      render(<MeetingCard meeting={completedMeeting} />)

      expect(screen.getByText('Selesai')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles missing duration gracefully', () => {
      const meetingWithoutDuration = {
        ...mockMeeting,
        duration: undefined,
      }

      render(<MeetingCard meeting={meetingWithoutDuration} />)

      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
      expect(screen.queryByText('menit')).not.toBeInTheDocument()
    })

    it('handles missing meeting room gracefully', () => {
      const meetingWithoutRoom = {
        ...mockMeeting,
        meetingRoom: null,
      }

      render(<MeetingCard meeting={meetingWithoutRoom} />)

      expect(screen.queryByText('Ruang Rapat:')).not.toBeInTheDocument()
    })

    it('handles missing meeting ID gracefully', () => {
      const meetingWithoutId = {
        ...mockExternalMeeting,
        meetingId: null,
      }

      render(<MeetingCard meeting={meetingWithoutId} />)

      expect(screen.queryByText('Meeting ID:')).not.toBeInTheDocument()
    })

    it('handles empty organizer name', () => {
      const meetingWithoutOrganizer = {
        ...mockMeeting,
        organizerName: '',
      }

      render(<MeetingCard meeting={meetingWithoutOrganizer} />)

      expect(screen.getByText('Penanggung Jawab:')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper button accessibility for expand/collapse', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      const expandButton = screen.getByText('Tampilkan Lebih Banyak')
      expect(expandButton.tagName).toBe('BUTTON')
    })

    it('maintains focus management when expanding/collapsing', async () => {
      render(<MeetingCard meeting={mockMeeting} />)

      const expandButton = screen.getByText('Tampilkan Lebih Banyak')
      expandButton.focus()
      fireEvent.click(expandButton)

      await waitFor(() => {
        const collapseButton = screen.getByText('Tampilkan Lebih Sedikit')
        expect(document.activeElement).toBe(collapseButton)
      })
    })
  })

  describe('Interaction Behavior', () => {
    it('applies hover effects correctly', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      const card = screen.getByTestId('card')
      expect(card.className).toContain('hover:scale-[1.02]')
      expect(card.className).toContain('hover:shadow-lg')
    })

    it('has cursor pointer for interactive elements', () => {
      render(<MeetingCard meeting={mockMeeting} />)

      const card = screen.getByTestId('card')
      expect(card.className).toContain('cursor-pointer')
    })
  })
})
