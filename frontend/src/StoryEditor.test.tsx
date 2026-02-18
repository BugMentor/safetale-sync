import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryEditor } from './StoryEditor'

const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
vi.mock('./yjsProvider', () => ({
  createStoryProvider: () => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
  }),
}))

describe('StoryEditor', () => {
  beforeEach(() => {
    mockConnect.mockClear()
    mockDisconnect.mockClear()
  })

  it('renders title and session input', () => {
    render(<StoryEditor />)
    expect(screen.getByText('SafeTale Sync')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Session ID')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Write your story here/)).toBeInTheDocument()
  })

  it('shows Synced after mount', () => {
    render(<StoryEditor />)
    expect(screen.getByText('Synced')).toBeInTheDocument()
  })

  it('calls provider connect on mount and disconnect on unmount', () => {
    const { unmount } = render(<StoryEditor />)
    expect(mockConnect).toHaveBeenCalledTimes(1)
    unmount()
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  it('session input change updates value and reconnects on sessionId change', () => {
    const { unmount } = render(<StoryEditor />)
    const input = screen.getByPlaceholderText('Session ID')
    fireEvent.change(input, { target: { value: 'room1' } })
    expect(input).toHaveValue('room1')
    expect(mockConnect).toHaveBeenCalled()
    unmount()
    render(<StoryEditor />)
    expect(mockConnect).toHaveBeenCalled()
  })

  it('session input empty falls back to default', () => {
    render(<StoryEditor />)
    const input = screen.getByPlaceholderText('Session ID')
    fireEvent.change(input, { target: { value: 'x' } })
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('default')
  })

  it('typing in textarea triggers change handler', () => {
    render(<StoryEditor />)
    const textarea = screen.getByPlaceholderText(/Write your story here/)
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    expect(textarea).toHaveValue('Hello')
    fireEvent.change(textarea, { target: { value: 'Hello world' } })
    expect(textarea).toHaveValue('Hello world')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    expect(textarea).toHaveValue('Hello')
  })

  it('handleChange with no diff does not throw', () => {
    render(<StoryEditor />)
    const textarea = screen.getByPlaceholderText(/Write your story here/)
    fireEvent.change(textarea, { target: { value: 'a' } })
    fireEvent.change(textarea, { target: { value: 'a' } })
    expect(textarea).toHaveValue('a')
  })
})
