import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CalendarGrid from '../calendar-grid'
import type { PublicMeeting, LayoutConfig } from '@/types/public-calendar'

const mockLayoutConfig: LayoutConfig = {
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  cardSize: {
    compact: false,
    showDescription: true,
    maxDescriptionLength: 120,
  },
  grouping: {
    enabled: true,
    by: 'date',
  },
}

const mockMeetings: PublicMeeting[] = [
  {
    id: '1',
    title: 'Meeting 1',
    description: 'Description 1',
    start: '2024-01-15T09:00:00Z',
    end: '2024-01-15T10:00:00Z',
    organizerName: 'John Doe',
    status: 'Akan Datang',
    meetingType: 'internal',
    meetingRoom: 'Room A',
    duration: 60,
    isToday: false,
    isOngoing: false,
  },
  {
    id: '2',
    title: 'Meeting 2',
    description: 'Description 2',
    start: '2024-01-15T14:00:00Z',
    end: '2024-01-15T15:00:00Z',
    organizerName: 'Jane Smith',
    status: 'Sedang Berlangsung',
    meetingType: 'external',
    meetingId: '12345678901',
    meetingRoom: null,
    duration: 60,
    isToday: true,
    isOngoing: true,
  },
]

describe('CalendarGrid', () => {
  it('renders loading skeleton when loading is true', () => {
    render(
      <CalendarGrid
        meetings={[]}
        groupBy="date"
        loading={true}
        viewMode="grid"
        layoutConfig={mockLayoutConfig}
      />,
    )

    // Should show loading content
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders empty state when no meetings provided', () => {
    render(
      <CalendarGrid
        meetings={[]}
        groupBy="date"
        loading={false}
        viewMode="grid"
        layoutConfig={mockLayoutConfig}
      />,
    )

    expect(screen.getByText('Tidak Ada Rapat')).toBeInTheDocument()
    expect(
      screen.getByText(/Tidak ada rapat yang ditemukan/),
    ).toBeInTheDocument()
  })

  it('renders meetings when provided', () => {
    render(
      <CalendarGrid
        meetings={mockMeetings}
        groupBy="date"
        loading={false}
        viewMode="grid"
        layoutConfig={mockLayoutConfig}
      />,
    )

    // Check meeting titles are displayed
    expect(screen.getByText('Meeting 1')).toBeInTheDocument()
    expect(screen.getByText('Meeting 2')).toBeInTheDocument()
  })

  it('applies correct grid classes', () => {
    const { container } = render(
      <CalendarGrid
        meetings={mockMeetings}
        groupBy="date"
        loading={false}
        viewMode="grid"
        layoutConfig={mockLayoutConfig}
      />,
    )

    // Find the main meeting grid containers (should have w-full class)
    const meetingGrids = container.querySelectorAll('.grid.w-full')
    expect(meetingGrids.length).toBeGreaterThan(0)

    // Check that the main grid classes are applied correctly
    meetingGrids.forEach((grid) => {
      expect(grid).toHaveClass('grid')
      expect(grid).toHaveClass('w-full')
      expect(grid.className).toMatch(/gap-/)
    })
  })

  it('handles different groupBy modes', () => {
    const groupByModes: Array<'date' | 'status' | 'type'> = [
      'date',
      'status',
      'type',
    ]

    groupByModes.forEach((groupBy) => {
      const { unmount } = render(
        <CalendarGrid
          meetings={mockMeetings}
          groupBy={groupBy}
          loading={false}
          viewMode="grid"
          layoutConfig={mockLayoutConfig}
        />,
      )

      // Should render meetings regardless of grouping
      expect(screen.getAllByText('Meeting 1')).toHaveLength(1)
      expect(screen.getAllByText('Meeting 2')).toHaveLength(1)

      // Clean up for next iteration
      unmount()
    })
  })

  it('handles different view modes', () => {
    const viewModes: Array<'grid' | 'list' | 'compact'> = [
      'grid',
      'list',
      'compact',
    ]

    viewModes.forEach((viewMode) => {
      const { unmount } = render(
        <CalendarGrid
          meetings={mockMeetings}
          groupBy="date"
          loading={false}
          viewMode={viewMode}
          layoutConfig={mockLayoutConfig}
        />,
      )

      // Should render meetings regardless of view mode
      expect(screen.getAllByText('Meeting 1')).toHaveLength(1)
      expect(screen.getAllByText('Meeting 2')).toHaveLength(1)

      // Clean up for next iteration
      unmount()
    })
  })
})
