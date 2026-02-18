import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { createStoryProvider } from './yjsProvider'

const SESSION_ID = 'default'

function diffStrings(prev: string, next: string): { type: 'insert' | 'delete'; index: number; value: string } | null {
  const len = Math.min(prev.length, next.length)
  let i = 0
  while (i < len && prev[i] === next[i]) i++
  const suffixLen = Math.min(prev.length - i, next.length - i)
  let j = 0
  while (j < suffixLen && prev[prev.length - 1 - j] === next[next.length - 1 - j]) j++
  const fromStart = i
  const fromEnd = prev.length - j
  const toStart = i
  const toEnd = next.length - j
  if (fromEnd > fromStart) {
    return { type: 'delete', index: fromStart, value: prev.slice(fromStart, fromEnd) }
  }
  if (toEnd > toStart) {
    return { type: 'insert', index: fromStart, value: next.slice(toStart, toEnd) }
  }
  return null
}

export function StoryEditor() {
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState(SESSION_ID)
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<ReturnType<typeof createStoryProvider> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevValueRef = useRef('')
  const isRemoteRef = useRef(false)

  useEffect(() => {
    const doc = new Y.Doc()
    const yText = doc.getText('story')
    docRef.current = doc

    const provider = createStoryProvider(sessionId, doc)
    providerRef.current = provider
    provider.connect()
    setConnected(true)

    const syncToTextarea = (value: string) => {
      isRemoteRef.current = true
      prevValueRef.current = value
      if (textareaRef.current) {
        const selStart = textareaRef.current.selectionStart
        const selEnd = textareaRef.current.selectionEnd
        textareaRef.current.value = value
        textareaRef.current.selectionStart = Math.min(selStart, value.length)
        textareaRef.current.selectionEnd = Math.min(selEnd, value.length)
      }
      isRemoteRef.current = false
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
    if (isRemoteRef.current || !docRef.current) return
    const next = e.target.value
    const prev = prevValueRef.current
    const yText = docRef.current.getText('story')
    const op = diffStrings(prev, next)
    if (op) {
      if (op.type === 'delete') {
        yText.delete(op.index, op.value.length)
      } else {
        yText.insert(op.index, op.value)
      }
      prevValueRef.current = yText.toString()
    }
  }

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
