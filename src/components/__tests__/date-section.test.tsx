import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DateSection from '../date-section'

// Mock the calendar-utils module
vi.mock('@/lib/calendar-utils', () => ({
  formatDateSection: vi.fn((date: Date) => {
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return `Hari Ini - ${date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}`
    }
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }),
}))

describe('DateSection', () => {
  const mockDate = new Date('2024-01-15T10:00:00Z')
  const mockChildren = <div data-testid="mock-children">Mock meeting cards</div>

  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      render(
        <DateSection date={mockDate} meetingCount={3}>
          {mockChildren}
        </DateSection>,
      )

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      expect(screen.getByText('3 rapat')).toBeInTheDocument()
      expect(screen.getByTestId('mock-children')).toBeInTheDocument()
    })

    it('displays formatted date correctly', () => {
      render(
        <DateSection date={mockDate} meetingCount={1}>
          {mockChildren}
        </DateSection>,
      )

      // The mock formatDateSection should be called and return a formatted date
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        /Senin, 15 Januari 2024/,
      )
    })

    it('displays correct meeting count with singular form', () => {
      render(
        <DateSection date={mockDate} meetingCount={1}>
          {mockChildren}
        </DateSection>,
      )

      expect(screen.getByText('1 rapat')).toBeInTheDocument()
    })

    it('displays correct meeting count with plural form', () => {
      render(
        <DateSection date={mockDate} meetingCount={5}>
          {mockChildren}
        </DateSection>,
      )

      expect(screen.getByText('5 rapat')).toBeInTheDocument()
    })

    it('renders calendar icon', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      // Check for calendar icon by looking for svg element
      const calendarIcon = screen
        .getByRole('heading', { level: 2 })
        .parentElement?.querySelector('svg')
      expect(calendarIcon).toBeInTheDocument()
    })
  })

  describe('Collapsible Functionality', () => {
    it('renders as collapsible by default', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const header = screen.getByRole('button', { name: /sembunyikan rapat/i })
      expect(header.closest('[role="button"]')).toBeInTheDocument()
      expect(header.closest('[role="button"]')).toHaveAttribute(
        'aria-expanded',
        'true',
      )
    })

    it('renders as expanded by default', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      expect(screen.getByTestId('mock-children')).toBeVisible()
      expect(screen.getByLabelText('Sembunyikan rapat')).toBeInTheDocument()
    })

    it('can be collapsed when clicked', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /sembunyikan rapat/i })
        .closest('[role="button"]')
      fireEvent.click(headerContainer!)

      expect(headerContainer).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByLabelText('Tampilkan rapat')).toBeInTheDocument()
    })

    it('can be expanded again after being collapsed', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /sembunyikan rapat/i })
        .closest('[role="button"]')

      // Collapse
      fireEvent.click(headerContainer!)
      expect(headerContainer).toHaveAttribute('aria-expanded', 'false')

      // Expand again
      fireEvent.click(headerContainer!)
      expect(headerContainer).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByLabelText('Sembunyikan rapat')).toBeInTheDocument()
    })

    it('supports keyboard navigation with Enter key', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /sembunyikan rapat/i })
        .closest('[role="button"]')
      fireEvent.keyDown(headerContainer!, { key: 'Enter' })

      expect(headerContainer).toHaveAttribute('aria-expanded', 'false')
    })

    it('supports keyboard navigation with Space key', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /sembunyikan rapat/i })
        .closest('[role="button"]')
      fireEvent.keyDown(headerContainer!, { key: ' ' })

      expect(headerContainer).toHaveAttribute('aria-expanded', 'false')
    })

    it('ignores other keyboard keys', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /sembunyikan rapat/i })
        .closest('[role="button"]')
      fireEvent.keyDown(headerContainer!, { key: 'Tab' })

      expect(headerContainer).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Non-collapsible Mode', () => {
    it('renders as non-collapsible when collapsible=false', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} collapsible={false}>
          {mockChildren}
        </DateSection>,
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText('Sembunyikan rapat'),
      ).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Tampilkan rapat')).not.toBeInTheDocument()
    })

    it('always shows content when non-collapsible', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} collapsible={false}>
          {mockChildren}
        </DateSection>,
      )

      expect(screen.getByTestId('mock-children')).toBeVisible()
    })

    it('does not respond to clicks when non-collapsible', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} collapsible={false}>
          {mockChildren}
        </DateSection>,
      )

      const header = screen.getByRole('heading', { level: 2 }).closest('div')
      fireEvent.click(header!)

      // Content should still be visible
      expect(screen.getByTestId('mock-children')).toBeVisible()
    })
  })

  describe('Default Expanded State', () => {
    it('can start collapsed when defaultExpanded=false', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} defaultExpanded={false}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /tampilkan rapat/i })
        .closest('[role="button"]')
      expect(headerContainer).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByLabelText('Tampilkan rapat')).toBeInTheDocument()
    })

    it('respects defaultExpanded=true', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} defaultExpanded={true}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /sembunyikan rapat/i })
        .closest('[role="button"]')
      expect(headerContainer).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByLabelText('Sembunyikan rapat')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes when collapsible', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /sembunyikan rapat/i })
        .closest('[role="button"]')
      expect(headerContainer).toHaveAttribute('aria-expanded')
      expect(headerContainer).toHaveAttribute('aria-controls')
      expect(headerContainer).toHaveAttribute('tabIndex', '0')
    })

    it('does not have ARIA attributes when non-collapsible', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} collapsible={false}>
          {mockChildren}
        </DateSection>,
      )

      const header = screen
        .getByRole('heading', { level: 2 })
        .closest('div')?.parentElement
      expect(header).not.toHaveAttribute('aria-expanded')
      expect(header).not.toHaveAttribute('aria-controls')
      expect(header).not.toHaveAttribute('tabIndex')
    })

    it('has proper aria-hidden on content when collapsed', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} defaultExpanded={false}>
          {mockChildren}
        </DateSection>,
      )

      const contentContainer = screen
        .getByTestId('mock-children')
        .closest('[aria-hidden]')
      expect(contentContainer).toHaveAttribute('aria-hidden', 'true')
    })

    it('does not have aria-hidden on content when expanded', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} defaultExpanded={true}>
          {mockChildren}
        </DateSection>,
      )

      const contentContainer = screen
        .getByTestId('mock-children')
        .closest('[aria-hidden]')
      expect(contentContainer).toHaveAttribute('aria-hidden', 'false')
    })
  })

  describe('Responsive Design', () => {
    it('applies correct CSS classes for responsive layout', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const section = screen
        .getByRole('heading', { level: 2 })
        .closest('section')
      expect(section).toHaveClass('space-y-4')
    })

    it('applies hover styles when collapsible', () => {
      render(
        <DateSection date={mockDate} meetingCount={2}>
          {mockChildren}
        </DateSection>,
      )

      const headerContainer = screen
        .getByRole('button', { name: /sembunyikan rapat/i })
        .closest('[role="button"]')
      expect(headerContainer).toHaveClass('hover:bg-muted/70')
    })

    it('does not apply hover styles when non-collapsible', () => {
      render(
        <DateSection date={mockDate} meetingCount={2} collapsible={false}>
          {mockChildren}
        </DateSection>,
      )

      // Find the main header container (the one with the styling classes)
      const headerContainer = screen
        .getByRole('heading', { level: 2 })
        .closest('div')?.parentElement?.parentElement
      expect(headerContainer).not.toHaveClass('hover:bg-muted/70')
      expect(headerContainer).toHaveClass('cursor-default')
    })
  })

  describe('Edge Cases', () => {
    it('handles zero meeting count', () => {
      render(
        <DateSection date={mockDate} meetingCount={0}>
          {mockChildren}
        </DateSection>,
      )

      expect(screen.getByText('0 rapat')).toBeInTheDocument()
    })

    it('handles large meeting count', () => {
      render(
        <DateSection date={mockDate} meetingCount={999}>
          {mockChildren}
        </DateSection>,
      )

      expect(screen.getByText('999 rapat')).toBeInTheDocument()
    })

    it("handles today's date formatting", () => {
      const today = new Date()
      render(
        <DateSection date={today} meetingCount={1}>
          {mockChildren}
        </DateSection>,
      )

      // Should show "Hari Ini" for today's date
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        /Hari Ini/,
      )
    })

    it('renders without children', () => {
      render(<DateSection date={mockDate} meetingCount={0} />)

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      expect(screen.getByText('0 rapat')).toBeInTheDocument()
    })
  })
})
