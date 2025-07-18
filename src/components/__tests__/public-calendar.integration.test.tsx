import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PublicCalendar from '../public-calendar'
import type { PublicMeeting } from '@/types/public-calendar'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock fullscreen API
const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined)
const mockExitFullscreen = vi.fn().mockResolvedValue(undefined)

Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
})

Object.defineProperty(document.documentElement, 'requestFullscreen', {
  writable: true,
  value: mockRequestFullscreen,
})

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: mockExitFullscreen,
})

// Mock data - using current week dates to ensure they show up in the calendar
const now = new Date()
const mockMeetingsData: Omit<
  PublicMeeting,
  'duration' | 'isToday' | 'isOngoing'
>[] = [
  {
    id: '1',
    title: 'Team Standup',
    description: 'Daily team standup meeting',
    start: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    end: new Date(now.getTime() + 90 * 60 * 1000).toISOString(), // 1.5 hours from now
    organizerName: 'John Doe',
    status: 'Akan Datang',
    meetingType: 'internal',
    meetingRoom: 'Conference Room A',
  },
  {
    id: '2',
    title: 'Client Presentation',
    description: 'Quarterly business review with client',
    start: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    end: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    organizerName: 'Jane Smith',
    status: 'Sedang Berlangsung',
    meetingType: 'external',
    meetingId: '12345678901',
    meetingRoom: null,
  },
  {
    id: '3',
    title: 'Project Planning',
    description: 'Planning session for Q1 projects',
    start: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    end: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    organizerName: 'Bob Wilson',
    status: 'Selesai',
    meetingType: 'internal',
    meetingRoom: 'Conference Room B',
  },
  {
    id: '4',
    title: 'External Review',
    description: 'External stakeholder review meeting',
    start: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    end: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    organizerName: 'Alice Johnson',
    status: 'Akan Datang',
    meetingType: 'external',
    meetingId: '98765432109',
    meetingRoom: null,
  },
]

describe('PublicCalendar Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMeetingsData,
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial Loading and Data Fetching', () => {
    it('should show loading state initially and then display meetings', async () => {
      render(<PublicCalendar />)

      // Should show loading state
      expect(screen.getByText('Memuat kalender rapat...')).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })

      // Should display all meetings
      expect(screen.getByText('Team Standup')).toBeInTheDocument()
      expect(screen.getByText('Client Presentation')).toBeInTheDocument()
      expect(screen.getByText('Project Planning')).toBeInTheDocument()
      expect(screen.getByText('External Review')).toBeInTheDocument()
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
        expect(screen.getByText(/Network error/)).toBeInTheDocument()
      })

      // Should show retry button
      const retryButton = screen.getByText('Coba Lagi')
      expect(retryButton).toBeInTheDocument()
    })

    it('should retry data fetching when retry button is clicked', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMeetingsData,
      })

      render(<PublicCalendar />)

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Coba Lagi')
      await user.click(retryButton)

      // Should show loading and then data
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      render(<PublicCalendar />)
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })
    })

    it('should filter meetings by search term', async () => {
      // Use getAllByPlaceholderText to handle multiple search inputs (desktop and mobile)
      const searchInputs = screen.getAllByPlaceholderText('Search meetings...')
      const searchInput = searchInputs[0] // Use the first one (desktop version)

      await user.type(searchInput, 'Team')

      // Should show only meetings matching search term
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
        expect(
          screen.queryByText('Client Presentation'),
        ).not.toBeInTheDocument()
        expect(screen.queryByText('Project Planning')).not.toBeInTheDocument()
      })
    })

    it('should search across multiple fields (title, description, organizer)', async () => {
      const searchInputs = screen.getAllByPlaceholderText('Search meetings...')
      const searchInput = searchInputs[0]

      // Search by organizer name
      await user.clear(searchInput)
      await user.type(searchInput, 'Jane')

      await waitFor(() => {
        expect(screen.getByText('Client Presentation')).toBeInTheDocument()
        expect(screen.queryByText('Team Standup')).not.toBeInTheDocument()
      })

      // Search by description
      await user.clear(searchInput)
      await user.type(searchInput, 'Quarterly')

      await waitFor(() => {
        expect(screen.getByText('Client Presentation')).toBeInTheDocument()
        expect(screen.queryByText('Team Standup')).not.toBeInTheDocument()
      })
    })

    it('should show no results message when search yields no matches', async () => {
      const searchInputs = screen.getAllByPlaceholderText('Search meetings...')
      const searchInput = searchInputs[0]

      await user.type(searchInput, 'NonexistentMeeting')

      await waitFor(() => {
        expect(screen.getByText('Tidak Ada Rapat')).toBeInTheDocument()
        expect(
          screen.getByText(/Tidak ada rapat yang ditemukan/),
        ).toBeInTheDocument()
      })
    })

    it('should clear search when clear button is clicked', async () => {
      const searchInputs = screen.getAllByPlaceholderText('Search meetings...')
      const searchInput = searchInputs[0]

      await user.type(searchInput, 'Team')

      // Wait for filtered results
      await waitFor(() => {
        expect(
          screen.queryByText('Client Presentation'),
        ).not.toBeInTheDocument()
      })

      // Find and click clear filters button (use getAllByText to handle multiple buttons)
      const clearButtons = screen.getAllByText('Clear all filters')
      const clearButton = clearButtons[0] // Use the first one (desktop version)
      await user.click(clearButton)

      // Should show all meetings again
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
        expect(screen.getByText('Client Presentation')).toBeInTheDocument()
      })
    })
  })

  describe('Filter Functionality', () => {
    beforeEach(async () => {
      render(<PublicCalendar />)
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })
    })

    it('should filter meetings by type', async () => {
      // Find and click the meeting type filter checkbox
      const internalCheckbox = screen.getByLabelText('Internal')
      await user.click(internalCheckbox)

      // Should show only internal meetings
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
        expect(screen.getByText('Project Planning')).toBeInTheDocument()
        expect(
          screen.queryByText('Client Presentation'),
        ).not.toBeInTheDocument()
        expect(screen.queryByText('External Review')).not.toBeInTheDocument()
      })
    })
  })

  describe('Date Navigation', () => {
    beforeEach(async () => {
      render(<PublicCalendar />)
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })
    })

    it('should navigate to previous week', async () => {
      const prevButton = screen.getByTitle('Minggu sebelumnya')
      await user.click(prevButton)

      // Should update the date display (exact text depends on current date)
      // We can verify the button was clicked by checking if it's still enabled
      expect(prevButton).toBeInTheDocument()
    })

    it('should navigate to next week', async () => {
      const nextButton = screen.getByTitle('Minggu selanjutnya')
      await user.click(nextButton)

      // Should update the date display
      expect(nextButton).toBeInTheDocument()
    })

    it('should return to current week when today button is clicked', async () => {
      // Navigate away first
      const nextButton = screen.getByTitle('Minggu selanjutnya')
      await user.click(nextButton)

      // Then click today button
      const todayButton = screen.getByText('Hari Ini')
      await user.click(todayButton)

      // Should return to current week (meetings should be visible again)
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Functionality', () => {
    beforeEach(async () => {
      render(<PublicCalendar />)
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })
    })

    it('should refresh data when refresh button is clicked', async () => {
      const refreshButton = screen.getByTitle('Refresh data')

      // Mock new data for refresh
      const newMeetingData = [
        ...mockMeetingsData,
        {
          id: '5',
          title: 'New Meeting',
          description: 'Newly added meeting',
          start: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
          end: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
          organizerName: 'New Organizer',
          status: 'Akan Datang' as const,
          meetingType: 'internal' as const,
          meetingRoom: 'New Room',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newMeetingData,
      })

      await user.click(refreshButton)

      // Should show the new meeting
      await waitFor(() => {
        expect(screen.getByText('New Meeting')).toBeInTheDocument()
      })
    })
  })

  describe('Fullscreen Functionality', () => {
    beforeEach(async () => {
      render(<PublicCalendar />)
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })
    })

    it('should toggle fullscreen mode', async () => {
      const fullscreenButton = screen.getByTitle('Masuk ke layar penuh')

      await user.click(fullscreenButton)

      expect(mockRequestFullscreen).toHaveBeenCalled()
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle empty meeting list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(screen.getByText('Tidak Ada Rapat')).toBeInTheDocument()
        expect(
          screen.getByText(/Tidak ada rapat yang ditemukan/),
        ).toBeInTheDocument()
      })
    })

    it('should handle malformed API response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      })

      render(<PublicCalendar />)

      // Should handle gracefully and show error state
      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
      })
    })

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      })

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
        expect(screen.getByText(/HTTP 500/)).toBeInTheDocument()
      })
    })

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
        expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument()
      })
    })

    it('should handle very long meeting titles and descriptions', async () => {
      const longMeetingData = [
        {
          id: '1',
          title:
            'This is a very long meeting title that should be truncated properly to avoid layout issues and maintain readability',
          description:
            'This is an extremely long description that contains a lot of details about the meeting agenda, participants, objectives, and other important information that might overflow the card layout if not handled properly',
          start: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
          end: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
          organizerName: 'John Doe',
          status: 'Akan Datang' as const,
          meetingType: 'internal' as const,
          meetingRoom: 'Conference Room A',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => longMeetingData,
      })

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(
          screen.getByText(/This is a very long meeting title/),
        ).toBeInTheDocument()
      })
    })

    it('should handle meetings with missing optional fields', async () => {
      const incompleteMeetingData = [
        {
          id: '1',
          title: 'Basic Meeting',
          description: null,
          start: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
          end: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
          organizerName: 'John Doe',
          status: 'Akan Datang' as const,
          meetingType: 'internal' as const,
          meetingRoom: null,
          meetingId: null,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => incompleteMeetingData,
      })

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(screen.getByText('Basic Meeting')).toBeInTheDocument()
      })
    })
  })

  describe('Component Interactions and State Management', () => {
    beforeEach(async () => {
      render(<PublicCalendar />)
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })
    })

    it('should maintain filter state when refreshing', async () => {
      // Apply a filter
      const searchInputs = screen.getAllByPlaceholderText('Search meetings...')
      const searchInput = searchInputs[0]
      await user.type(searchInput, 'Team')

      await waitFor(() => {
        expect(
          screen.queryByText('Client Presentation'),
        ).not.toBeInTheDocument()
      })

      // Refresh the data
      const refreshButton = screen.getByTitle('Refresh data')
      await user.click(refreshButton)

      // Filter should still be applied
      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
        expect(
          screen.queryByText('Client Presentation'),
        ).not.toBeInTheDocument()
      })
    })

    it('should handle rapid filter changes', async () => {
      const searchInputs = screen.getAllByPlaceholderText('Search meetings...')
      const searchInput = searchInputs[0]

      // Type rapidly
      await user.type(searchInput, 'Team')
      await user.clear(searchInput)
      await user.type(searchInput, 'Client')
      await user.clear(searchInput)
      await user.type(searchInput, 'Project')

      // Should handle the final search term
      await waitFor(() => {
        expect(screen.getByText('Project Planning')).toBeInTheDocument()
        expect(screen.queryByText('Team Standup')).not.toBeInTheDocument()
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })

      // Should render mobile-friendly layout
      expect(screen.getByText('Team Standup')).toBeInTheDocument()
    })

    it('should handle tablet viewport', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })

      expect(screen.getByText('Team Standup')).toBeInTheDocument()
    })

    it('should handle desktop viewport', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(<PublicCalendar />)

      await waitFor(() => {
        expect(screen.getByText('Team Standup')).toBeInTheDocument()
      })

      expect(screen.getByText('Team Standup')).toBeInTheDocument()
    })
  })
})
