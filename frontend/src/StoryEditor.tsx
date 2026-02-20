import { useCallback, useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { createStoryProvider } from './yjsProvider'
import { diffStrings } from './utils/diffStrings'

const SESSION_ID = 'default'
const API_GENERATE_STORY = '/api/generate-story'

export function StoryEditor() {
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState(SESSION_ID)
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<ReturnType<typeof createStoryProvider> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevValueRef = useRef('')

  useEffect(() => {
    const doc = new Y.Doc()
    const yText = doc.getText('story')
    docRef.current = doc

    const provider = createStoryProvider(sessionId, doc, setConnected)
    providerRef.current = provider
    provider.connect()

    const syncToTextarea = (value: string) => {
      prevValueRef.current = value
      // safe to assume ref exists while mounted/observed
      const ta = textareaRef.current!
      const selStart = ta.selectionStart
      const selEnd = ta.selectionEnd
      ta.value = value
      ta.selectionStart = Math.min(selStart, value.length)
      ta.selectionEnd = Math.min(selEnd, value.length)
    }
    syncToTextarea(yText.toString())
    const observer = () => syncToTextarea(yText.toString())
    yText.observe(observer)

    return () => {
      yText.unobserve(observer)
      provider.disconnect()
      doc.destroy()
      docRef.current = null
      providerRef.current = null
      setConnected(false)
    }
  }, [sessionId])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    const prev = prevValueRef.current
    // docRef is always present when mounted/handling events
    const yText = docRef.current!.getText('story')
    const op = diffStrings(prev, next)
    /* v8 ignore start */
    if (!op) {
      return
    }
    /* v8 ignore stop */

    if (op.type === 'delete') {
      yText.delete(op.index, op.value.length)
    } else {
      yText.insert(op.index, op.value)
    }
    prevValueRef.current = yText.toString()
  }

  const generateStory = useCallback(async () => {
    const prompt = userInput.trim()
    if (!prompt || !docRef.current) return
    setError(null)
    setLoading(true)
    try {
      const storyContext = docRef.current.getText('story').toString()
      const res = await fetch(API_GENERATE_STORY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_context: storyContext, user_input: prompt }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { response: string }
      const response = data.response ?? ''
      if (response && docRef.current) {
        const yText = docRef.current.getText('story')
        // if we are here, docRef.current is valid, so textareaRef is valid
        const insertIndex = textareaRef.current!.selectionStart

        const toInsert = (insertIndex > 0 && yText.length > 0 ? '\n\n' : '') + response
        yText.insert(insertIndex, toInsert)
        prevValueRef.current = yText.toString()
        setUserInput('')
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            const newPos = insertIndex + toInsert.length
            textareaRef.current.selectionStart = newPos
            textareaRef.current.selectionEnd = newPos
            textareaRef.current.focus()
          }
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate story')
    } finally {
      setLoading(false)
    }
  }, [userInput])

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <header className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">SafeTale Sync</h1>
        <span
          className={`inline-flex items-center gap-1.5 text-sm ${connected ? 'text-green-600' : 'text-amber-600'}`}
        >
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500'}`} />
          {connected ? 'Synced' : 'Connecting…'}
        </span>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value || SESSION_ID)}
          className="ml-auto px-2 py-1 border rounded text-sm"
          placeholder="Session ID"
        />
      </header>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={userInput}
          onChange={(e) => {
            setUserInput(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && generateStory()}
          className="flex-1 min-w-0 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="What should happen next? (e.g. The hero finds a key)"
          disabled={loading}
          aria-label="Story prompt"
        />
        <button
          type="button"
          onClick={generateStory}
          disabled={loading || !userInput.trim()}
          className="shrink-0 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          {loading ? 'Generating…' : 'Generate Story'}
        </button>
      </div>
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="flex-1 w-full p-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Write your story here… Multiple tabs will stay in sync."
        onChange={handleChange}
        defaultValue=""
      />
    </div>
  )
}
