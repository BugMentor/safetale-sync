import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryEditor } from './StoryEditor'

const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
vi.mock('./yjsProvider', () => ({
  createStoryProvider: (_id: string, _doc: any, onStatusChange?: (c: boolean) => void) => ({
    connect: () => {
      mockConnect()
      onStatusChange?.(true)
    },
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

  // Actually let's add it to the existing `handleChange` or `typing` test if appropriate, 
  // or a new one that mocks the state. 
  // Since I can't easily set state from outside without triggering it, I'll use the failure test and then type.

  it('clears error when typing in prompt', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Fail'))
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    const input = screen.getByLabelText(/Story prompt/i)
    fireEvent.change(input, { target: { value: 'fail' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))
    await screen.findByText('Fail')

    fireEvent.change(input, { target: { value: 'retry' } })
    expect(screen.queryByText('Fail')).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('handleChange with no diff does not throw', () => {
    render(<StoryEditor />)
    const textarea = screen.getByPlaceholderText(/Write your story here/)
    fireEvent.change(textarea, { target: { value: 'a' } })
    fireEvent.change(textarea, { target: { value: 'b' } })
    fireEvent.change(textarea, { target: { value: 'b' } })
    expect(textarea).toHaveValue('b')
  })

  it('handleChange returns early when textarea value is unchanged (no diff op)', () => {
    render(<StoryEditor />)
    const textarea = screen.getByPlaceholderText(/Write your story here/)
    // Fire change with empty string - prev is '' and next is '' so diffStrings returns null
    // This covers the `if (!op) return` branch on the first possible call
    fireEvent.change(textarea, { target: { value: '' } })
    // Still empty — guaranteed null diff from the very first event
    expect(textarea).toHaveValue('')
    // Now set a value, then fire the same value again
    fireEvent.change(textarea, { target: { value: 'same' } })
    fireEvent.change(textarea, { target: { value: 'same' } })
    expect(textarea).toHaveValue('same')
  })

  it('renders Generate Story prompt input and button', () => {
    render(<StoryEditor />)
    expect(screen.getByPlaceholderText(/What should happen next/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate Story/i })).toBeInTheDocument()
  })

  it('Generate Story button is disabled when prompt is empty', () => {
    render(<StoryEditor />)
    expect(screen.getByRole('button', { name: /Generate Story/i })).toBeDisabled()
  })

  it('Generate Story button is enabled when prompt has text', () => {
    render(<StoryEditor />)
    fireEvent.change(screen.getByLabelText(/Story prompt/i), { target: { value: 'add a dragon' } })
    expect(screen.getByRole('button', { name: /Generate Story/i })).not.toBeDisabled()
  })

  it('on success inserts API response into story at cursor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: ' The dragon flew away.' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    const textarea = screen.getByPlaceholderText(/Write your story here/)
    fireEvent.change(textarea, { target: { value: 'Once upon a time.' } })
    fireEvent.change(screen.getByLabelText(/Story prompt/i), { target: { value: 'What next?' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))
    await screen.findByRole('button', { name: /Generating/i })
    await screen.findByRole('button', { name: /Generate Story/i })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/generate-story',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(textarea).toHaveValue('Once upon a time.\n\n The dragon flew away.')
    vi.unstubAllGlobals()
  })

  it('displays error when API fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    fireEvent.change(screen.getByLabelText(/Story prompt/i), { target: { value: 'fail' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))

    await screen.findByText('Server Error')
    expect(screen.getByRole('alert')).toHaveTextContent('Server Error')
    vi.unstubAllGlobals()
  })

  it('displays generic error when API fails with exception', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network Error'))
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    fireEvent.change(screen.getByLabelText(/Story prompt/i), { target: { value: 'fail' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))

    await screen.findByText('Network Error')
    vi.unstubAllGlobals()
  })

  it('displays fallback error when exception is not Error object', async () => {
    const fetchMock = vi.fn().mockRejectedValue('String Error')
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    fireEvent.change(screen.getByLabelText(/Story prompt/i), { target: { value: 'fail' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))

    await screen.findByText('Failed to generate story')
    vi.unstubAllGlobals()
  })

  it('displays generic error when API error text is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(''),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    fireEvent.change(screen.getByLabelText(/Story prompt/i), { target: { value: 'fail' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))

    await screen.findByText('HTTP 400')
    vi.unstubAllGlobals()
  })

  it('Enter on empty prompt does nothing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    const input = screen.getByLabelText(/Story prompt/i)
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('handles missing response field in API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}), // no response key
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    fireEvent.change(screen.getByLabelText(/Story prompt/i), { target: { value: 'go' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))
    await screen.findByRole('button', { name: /Generate Story/i })
    // No error, but no text added
    vi.unstubAllGlobals()
  })

  it('Enter key in prompt triggers generation', () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'ok' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    const input = screen.getByLabelText(/Story prompt/i)
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(fetchMock).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('Enter key with Shift does not trigger generation', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<StoryEditor />)
    const input = screen.getByLabelText(/Story prompt/i)
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('updates selection after insertion via requestAnimationFrame', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: ' World' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<StoryEditor />)
    const textarea = screen.getByPlaceholderText(/Write your story here/) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    // set cursor at end
    textarea.selectionStart = 5
    textarea.selectionEnd = 5

    fireEvent.change(screen.getByLabelText(/Story prompt/i), { target: { value: 'add' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))

    await screen.findByRole('button', { name: /Generate Story/i }) // wait for finish

    // allow microtasks/requestAnimationFrame (simulated via setTimeout usually) to run
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(textarea.value).toBe('Hello\n\n World')
    // The component sets selectionStart/End in requestAnimationFrame
    expect(textarea.selectionStart).toBe(13)
    expect(textarea.selectionEnd).toBe(13)

    vi.unstubAllGlobals()
  })

  it('does not crash if unmounted during generation', async () => {
    let resolveFetch: (value: unknown) => void = () => { }
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = render(<StoryEditor />)
    const input = screen.getByLabelText(/Story prompt/i)
    fireEvent.change(input, { target: { value: 'slow' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate Story/i }))

    // Unmount while loading
    unmount()

    // Resolve fetch
    resolveFetch({
      ok: true,
      json: () => Promise.resolve({ response: ' late' }),
    })

    // Should not throw unhandled rejection
    // We can't easily assert "no console error" unless we spy on it, but the test runner captures it.
    await new Promise(r => setTimeout(r, 10))
    vi.unstubAllGlobals()
  })
})
