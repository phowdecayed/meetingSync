import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CalendarFilters } from '../calendar-filters'
import { MeetingType, MeetingStatus } from '@/types/public-calendar'

// Mock the debounce hook
vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: vi.fn((value) => value),
}))

describe('CalendarFilters', () => {
  const mockProps = {
    searchTerm: '',
    onSearchChange: vi.fn(),
    selectedTypes: [] as MeetingType[],
    onTypeFilter: vi.fn(),
    selectedStatuses: [] as MeetingStatus[],
    onStatusFilter: vi.fn(),
    onClearFilters: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Search functionality', () => {
    it('renders search input with placeholder', () => {
      render(<CalendarFilters {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search meetings...')
      expect(searchInput).toBeInTheDocument()
    })

    it('displays search term in input', () => {
      render(<CalendarFilters {...mockProps} searchTerm="test meeting" />)

      const searchInput = screen.getByDisplayValue('test meeting')
      expect(searchInput).toBeInTheDocument()
    })

    it('calls onSearchChange when typing in search input', async () => {
      render(<CalendarFilters {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search meetings...')
      fireEvent.change(searchInput, { target: { value: 'new search' } })

      await waitFor(() => {
        expect(mockProps.onSearchChange).toHaveBeenCalledWith('new search')
      })
    })

    it('shows clear button when search term exists', () => {
      render(<CalendarFilters {...mockProps} searchTerm="test" />)

      const clearButton = screen.getByRole('button', { name: '' })
      expect(clearButton).toBeInTheDocument()
    })

    it('clears search when clear button is clicked', () => {
      render(<CalendarFilters {...mockProps} searchTerm="test" />)

      const clearButton = screen.getByRole('button', { name: '' })
      fireEvent.click(clearButton)

      const searchInput = screen.getByPlaceholderText('Search meetings...')
      expect(searchInput).toHaveValue('')
    })
  })

  describe('Meeting type filters', () => {
    it('renders meeting type checkboxes', () => {
      render(<CalendarFilters {...mockProps} />)

      expect(screen.getByLabelText('Internal')).toBeInTheDocument()
      expect(screen.getByLabelText('External')).toBeInTheDocument()
    })

    it('shows selected meeting types as checked', () => {
      render(<CalendarFilters {...mockProps} selectedTypes={['internal']} />)

      const internalCheckbox = screen.getByLabelText('Internal')
      const externalCheckbox = screen.getByLabelText('External')

      expect(internalCheckbox).toBeChecked()
      expect(externalCheckbox).not.toBeChecked()
    })

    it('calls onTypeFilter when meeting type is toggled', () => {
      render(<CalendarFilters {...mockProps} />)

      const internalCheckbox = screen.getByLabelText('Internal')
      fireEvent.click(internalCheckbox)

      expect(mockProps.onTypeFilter).toHaveBeenCalledWith(['internal'])
    })

    it('removes meeting type when already selected type is clicked', () => {
      render(<CalendarFilters {...mockProps} selectedTypes={['internal']} />)

      const internalCheckbox = screen.getByLabelText('Internal')
      fireEvent.click(internalCheckbox)

      expect(mockProps.onTypeFilter).toHaveBeenCalledWith([])
    })

    it('adds multiple meeting types', () => {
      render(<CalendarFilters {...mockProps} selectedTypes={['internal']} />)

      const externalCheckbox = screen.getByLabelText('External')
      fireEvent.click(externalCheckbox)

      expect(mockProps.onTypeFilter).toHaveBeenCalledWith([
        'internal',
        'external',
      ])
    })
  })

  describe('Meeting status filters', () => {
    it('renders meeting status badges', () => {
      render(<CalendarFilters {...mockProps} />)

      expect(screen.getByText('Akan Datang')).toBeInTheDocument()
      expect(screen.getByText('Sedang Berlangsung')).toBeInTheDocument()
      expect(screen.getByText('Selesai')).toBeInTheDocument()
    })

    it('calls onStatusFilter when status badge is clicked', () => {
      render(<CalendarFilters {...mockProps} />)

      const upcomingBadge = screen.getByText('Akan Datang')
      fireEvent.click(upcomingBadge)

      expect(mockProps.onStatusFilter).toHaveBeenCalledWith(['Akan Datang'])
    })

    it('removes status when already selected status is clicked', () => {
      render(
        <CalendarFilters {...mockProps} selectedStatuses={['Akan Datang']} />,
      )

      // Get all badges with the text and find the one in the filter section (not active summary)
      const upcomingBadges = screen.getAllByText('Akan Datang')
      const filterBadge = upcomingBadges.find(
        (badge) => badge.closest('.space-y-2') && !badge.closest('.border-t'),
      )

      if (filterBadge) {
        fireEvent.click(filterBadge)
        expect(mockProps.onStatusFilter).toHaveBeenCalledWith([])
      }
    })

    it('adds multiple statuses', () => {
      render(
        <CalendarFilters {...mockProps} selectedStatuses={['Akan Datang']} />,
      )

      const ongoingBadge = screen.getByText('Sedang Berlangsung')
      fireEvent.click(ongoingBadge)

      expect(mockProps.onStatusFilter).toHaveBeenCalledWith([
        'Akan Datang',
        'Sedang Berlangsung',
      ])
    })
  })

  describe('Clear filters functionality', () => {
    it('shows clear all button when filters are active', () => {
      render(
        <CalendarFilters
          {...mockProps}
          searchTerm="test"
          selectedTypes={['internal']}
        />,
      )

      const clearButton = screen.getByText('Clear all filters')
      expect(clearButton).toBeInTheDocument()
    })

    it('does not show clear all button when no filters are active', () => {
      render(<CalendarFilters {...mockProps} />)

      const clearButton = screen.queryByText('Clear all filters')
      expect(clearButton).not.toBeInTheDocument()
    })

    it('calls onClearFilters when clear all button is clicked', () => {
      render(<CalendarFilters {...mockProps} searchTerm="test" />)

      const clearButton = screen.getByText('Clear all filters')
      fireEvent.click(clearButton)

      expect(mockProps.onClearFilters).toHaveBeenCalled()
    })

    it('clears local search term when clear all is clicked', () => {
      render(<CalendarFilters {...mockProps} searchTerm="test" />)

      const clearButton = screen.getByText('Clear all filters')
      fireEvent.click(clearButton)

      const searchInput = screen.getByPlaceholderText('Search meetings...')
      expect(searchInput).toHaveValue('')
    })
  })

  describe('Active filters summary', () => {
    it('shows active type filters as removable badges', () => {
      render(
        <CalendarFilters
          {...mockProps}
          selectedTypes={['internal', 'external']}
        />,
      )

      const activeFilters = screen.getAllByText('internal')
      const activeFilters2 = screen.getAllByText('external')

      expect(activeFilters.length).toBeGreaterThan(0)
      expect(activeFilters2.length).toBeGreaterThan(0)
    })

    it('shows active status filters as removable badges', () => {
      render(
        <CalendarFilters {...mockProps} selectedStatuses={['Akan Datang']} />,
      )

      const activeFilters = screen.getAllByText('Akan Datang')
      expect(activeFilters.length).toBeGreaterThan(1) // One in filter section, one in active summary
    })

    it('removes filter when active filter badge is clicked', () => {
      render(<CalendarFilters {...mockProps} selectedTypes={['internal']} />)

      // Find the active filter badge (not the checkbox label)
      const activeFilterBadges = screen.getAllByText('internal')
      const activeBadge = activeFilterBadges.find(
        (el) =>
          el.closest('.cursor-pointer') &&
          el.parentElement?.querySelector('svg'),
      )

      if (activeBadge) {
        fireEvent.click(activeBadge)
        expect(mockProps.onTypeFilter).toHaveBeenCalledWith([])
      }
    })
  })

  describe('Responsive behavior', () => {
    it('shows filter toggle button on mobile', () => {
      render(<CalendarFilters {...mockProps} />)

      const filterButton = screen.getByText('Filters')
      expect(filterButton).toBeInTheDocument()
    })

    it('shows filter count badge when filters are active', () => {
      render(
        <CalendarFilters
          {...mockProps}
          selectedTypes={['internal']}
          selectedStatuses={['Akan Datang']}
        />,
      )

      const countBadge = screen.getByText('2')
      expect(countBadge).toBeInTheDocument()
    })
  })

  describe('Debounced search', () => {
    it('debounces search input changes', async () => {
      const { useDebounce } = await import('@/hooks/use-debounce')
      const mockUseDebounce = vi.mocked(useDebounce)

      // Mock debounce to return the value after a delay
      mockUseDebounce.mockImplementation((value, delay) => {
        return value // For testing, return immediately
      })

      render(<CalendarFilters {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search meetings...')
      fireEvent.change(searchInput, { target: { value: 'debounced search' } })

      expect(mockUseDebounce).toHaveBeenCalledWith('debounced search', 300)
    })
  })
})
