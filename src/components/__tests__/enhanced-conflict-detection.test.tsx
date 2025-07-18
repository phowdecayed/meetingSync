import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MeetingForm } from '../meeting-form'
import { SessionProvider } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Meeting, User } from '@/lib/data'
import { vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
}

const mockUsers: User[] = [
  {
    id: '1',
    email: 'user1@example.com',
    name: 'User 1',
    role: 'member',
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: '2',
    email: 'user2@example.com',
    name: 'User 2',
    role: 'member',
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
]

const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Existing Meeting 1',
    date: new Date('2024-01-15T10:00:00'),
    duration: 60,
    participants: 'user1@example.com',
    description: 'Test meeting',
    organizerId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    isZoomMeeting: false,
    zoomMeetingId: null,
    zoomJoinUrl: null,
    zoomStartUrl: null,
    zoomPassword: null,
    zoomCredentialId: null,
    meetingType: 'internal',
    meetingRoomId: null,
  },
  {
    id: '2',
    title: 'Existing Meeting 2',
    date: new Date('2024-01-15T10:30:00'),
    duration: 60,
    participants: 'user2@example.com',
    description: 'Another test meeting',
    organizerId: '2',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    isZoomMeeting: false,
    zoomMeetingId: null,
    zoomJoinUrl: null,
    zoomStartUrl: null,
    zoomPassword: null,
    zoomCredentialId: null,
    meetingType: 'internal',
    meetingRoomId: null,
  },
]

describe('Enhanced Conflict Detection', () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock).mockImplementation((url: RequestInfo) => {
      if (url.toString().includes('/api/meetings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMeetings),
        })
      }
      if (url.toString().includes('/api/meeting-rooms')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should display conflict warning for overlapping meetings', async () => {
    render(
      <SessionProvider session={null}>
        <MeetingForm allUsers={mockUsers} />
      </SessionProvider>,
    )

    // Fill in form fields to create a conflict
    const titleInput = screen.getByPlaceholderText(/quarterly review/i)
    fireEvent.change(titleInput, { target: { value: 'Test Meeting' } })

    // Set date to same day as existing meetings
    const dateButton = screen.getByRole('button', { name: /pick a date/i })
    fireEvent.click(dateButton)

    // Set time to overlap with existing meetings
    const timeInput = screen.getByDisplayValue(/\d{2}:\d{2}/)
    fireEvent.change(timeInput, { target: { value: '10:15' } })

    // Set duration
    const durationInput = screen.getByPlaceholderText('30')
    fireEvent.change(durationInput, { target: { value: '60' } })

    // Wait for conflict detection to run
    await waitFor(() => {
      expect(screen.getByText(/overlap/i)).toBeInTheDocument()
    })

    // Check that conflict indicator is displayed
    expect(screen.getByText(/warning/i)).toBeInTheDocument()
  })

  it('should show blocking error for too many overlapping meetings', async () => {
    render(
      <SessionProvider session={null}>
        <MeetingForm allUsers={mockUsers} />
      </SessionProvider>,
    )

    // Fill in form to create a third overlapping meeting (should be blocked)
    const titleInput = screen.getByPlaceholderText(/quarterly review/i)
    fireEvent.change(titleInput, { target: { value: 'Third Meeting' } })

    const timeInput = screen.getByDisplayValue(/\d{2}:\d{2}/)
    fireEvent.change(timeInput, { target: { value: '10:45' } })

    const durationInput = screen.getByPlaceholderText('30')
    fireEvent.change(durationInput, { target: { value: '60' } })

    await waitFor(() => {
      expect(screen.getByText(/blocking/i)).toBeInTheDocument()
    })

    // Submit button should be disabled
    const submitButton = screen.getByRole('button', { name: /create meeting/i })
    expect(submitButton).toBeDisabled()
  })

  it('should provide actionable time suggestions', async () => {
    render(
      <SessionProvider session={null}>
        <MeetingForm allUsers={mockUsers} />
      </SessionProvider>,
    )

    // Create a conflict scenario
    const titleInput = screen.getByPlaceholderText(/quarterly review/i)
    fireEvent.change(titleInput, { target: { value: 'Test Meeting' } })

    const timeInput = screen.getByDisplayValue(/\d{2}:\d{2}/)
    fireEvent.change(timeInput, { target: { value: '10:30' } })

    const durationInput = screen.getByPlaceholderText('30')
    fireEvent.change(durationInput, { target: { value: '30' } })

    await waitFor(() => {
      expect(screen.getByText(/quick fixes/i)).toBeInTheDocument()
    })

    // Check for suggestion buttons
    const suggestionButtons = screen.getAllByRole('button')
    const timeSuggestions = suggestionButtons.filter(
      (button) =>
        button.textContent?.includes(':') ||
        button.textContent?.includes('before') ||
        button.textContent?.includes('after'),
    )

    expect(timeSuggestions.length).toBeGreaterThan(0)
  })

  it('should update time when suggestion is clicked', async () => {
    render(
      <SessionProvider session={null}>
        <MeetingForm allUsers={mockUsers} />
      </SessionProvider>,
    )

    // Create a conflict scenario
    const titleInput = screen.getByPlaceholderText(/quarterly review/i)
    fireEvent.change(titleInput, { target: { value: 'Test Meeting' } })

    const timeInput = screen.getByDisplayValue(/\d{2}:\d{2}/)
    fireEvent.change(timeInput, { target: { value: '10:30' } })

    const durationInput = screen.getByPlaceholderText('30')
    fireEvent.change(durationInput, { target: { value: '30' } })

    await waitFor(() => {
      expect(screen.getByText(/quick fixes/i)).toBeInTheDocument()
    })

    // Click on a time suggestion
    const suggestionButtons = screen.getAllByRole('button')
    const timeSuggestion = suggestionButtons.find(
      (button) =>
        button.textContent?.includes('before conflicts') ||
        button.textContent?.includes('after conflicts'),
    )

    if (timeSuggestion) {
      fireEvent.click(timeSuggestion)

      // Time input should be updated
      await waitFor(() => {
        const updatedTimeInput = screen.getByDisplayValue(/\d{2}:\d{2}/)
        expect(updatedTimeInput.getAttribute('value')).not.toBe('10:30')
      })
    }
  })
})
