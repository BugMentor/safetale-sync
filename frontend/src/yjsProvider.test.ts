import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'
import { createStoryProvider, getWsUrl } from './yjsProvider'

const SYNC_REQUEST = 0x00
const SYNC_UPDATE = 0x01
const OPEN = 1

describe('createStoryProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'localhost:5173' },
    })
    vi.stubGlobal('import.meta', { env: { DEV: true } })
    const WsConstructor = vi.fn(function (this: unknown, url: string) {
      const send = vi.fn()
      let onopen: () => void = () => {}
      let onmessage: (e: MessageEvent<ArrayBuffer>) => void = () => {}
      let onclose: () => void = () => {}
      let onerror: () => void = () => {}
      let readyState = 0
      const ws = {
        url,
        send,
        binaryType: 'arraybuffer' as const,
        get readyState() {
          return readyState
        },
        set onopen(f: () => void) {
          onopen = f
        },
        get onmessage() {
          return onmessage
        },
        set onmessage(f: (e: MessageEvent<ArrayBuffer>) => void) {
          onmessage = f
        },
        set onclose(f: () => void) {
          onclose = f
        },
        set onerror(f: () => void) {
          onerror = f
        },
        close: vi.fn(() => {
          readyState = 3
          onclose()
        }),
        _triggerOpen() {
          readyState = OPEN
          onopen()
        },
        _triggerMessage(e: MessageEvent<ArrayBuffer>) {
          onmessage(e)
        },
      }
      setTimeout(() => {
        readyState = OPEN
        onopen()
      }, 0)
      return ws
    })
    WsConstructor.OPEN = OPEN
    vi.stubGlobal('WebSocket', WsConstructor)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('connect opens WebSocket with encoded session id', () => {
    const doc = new Y.Doc()
    const { connect } = createStoryProvider('a/b', doc)
    connect()
    expect(WebSocket).toHaveBeenCalledWith(expect.stringContaining('/ws/story/a%2Fb'))
    doc.destroy()
  })

  it('connect sends sync request on open', async () => {
    const doc = new Y.Doc()
    const { connect } = createStoryProvider('s1', doc)
    connect()
    await vi.runAllTimersAsync()
    const Ws = WebSocket as ReturnType<typeof vi.fn>
    const ws = Ws.mock.results[0]?.value
    expect(ws?.send).toHaveBeenCalled()
    const sent = ws.send.mock.calls[0][0] as Uint8Array
    expect(sent[0]).toBe(SYNC_REQUEST)
    doc.destroy()
  })

  it('onmessage SYNC_REQUEST sends state when doc has content', async () => {
    const doc = new Y.Doc()
    doc.getText('story').insert(0, 'hi')
    const { connect } = createStoryProvider('s1', doc)
    connect()
    await vi.runAllTimersAsync()
    const Ws = WebSocket as ReturnType<typeof vi.fn>
    const ws = Ws.mock.results[0]?.value
    ws._triggerMessage(new MessageEvent('message', { data: new Uint8Array([SYNC_REQUEST]).buffer }))
    const syncCalls = ws.send.mock.calls.filter((c: unknown[]) => (c[0] as Uint8Array)[0] === SYNC_UPDATE)
    expect(syncCalls.length).toBeGreaterThan(0)
    doc.destroy()
  })

  it('onmessage SYNC_UPDATE applies update to doc', async () => {
    const doc = new Y.Doc()
    const ref = new Y.Doc()
    ref.getText('story').insert(0, 'x')
    const update = Y.encodeStateAsUpdate(ref)
    ref.destroy()
    const { connect } = createStoryProvider('s1', doc)
    connect()
    await vi.runAllTimersAsync()
    const Ws = WebSocket as ReturnType<typeof vi.fn>
    const ws = Ws.mock.results[0]?.value
    const msg = new Uint8Array(1 + update.length)
    msg[0] = SYNC_UPDATE
    msg.set(update, 1)
    ws._triggerMessage(new MessageEvent('message', { data: msg.buffer }))
    expect(doc.getText('story').toString()).toBe('x')
    doc.destroy()
  })

  it('onmessage empty data does nothing', async () => {
    const doc = new Y.Doc()
    const { connect } = createStoryProvider('s1', doc)
    connect()
    await vi.runAllTimersAsync()
    const Ws = WebSocket as ReturnType<typeof vi.fn>
    const ws = Ws.mock.results[0]?.value
    ws._triggerMessage(new MessageEvent('message', { data: new ArrayBuffer(0) }))
    doc.destroy()
  })

  it('doc update sends SYNC_UPDATE', async () => {
    const doc = new Y.Doc()
    const yText = doc.getText('story')
    const { connect } = createStoryProvider('s1', doc)
    connect()
    await vi.runAllTimersAsync()
    const Ws = WebSocket as ReturnType<typeof vi.fn>
    const ws = Ws.mock.results[0]?.value
    yText.insert(0, 'x')
    const syncCalls = ws.send.mock.calls.filter((c: unknown[]) => (c[0] as Uint8Array)[0] === SYNC_UPDATE)
    expect(syncCalls.length).toBeGreaterThan(0)
    doc.destroy()
  })

  it('disconnect closes WebSocket', async () => {
    const doc = new Y.Doc()
    const { connect, disconnect } = createStoryProvider('s1', doc)
    connect()
    await vi.runAllTimersAsync()
    disconnect()
    const Ws = WebSocket as ReturnType<typeof vi.fn>
    const ws = Ws.mock.results[0]?.value
    expect(ws.close).toHaveBeenCalled()
    doc.destroy()
  })

  it('connect is no-op when already connected', async () => {
    const doc = new Y.Doc()
    const { connect } = createStoryProvider('s1', doc)
    connect()
    connect()
    await vi.runAllTimersAsync()
    expect(WebSocket).toHaveBeenCalledTimes(1)
    doc.destroy()
  })

  it('getWsUrl returns wss when protocol is https', () => {
    vi.stubGlobal('window', {
      location: { protocol: 'https:', host: 'localhost:5173' },
    })
    expect(getWsUrl('room1')).toMatch(/^wss:\/\/localhost:5173\/ws\/story\/room1$/)
  })

  it('getWsUrl returns ws when protocol is http', () => {
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'example.com' },
    })
    expect(getWsUrl('s1')).toMatch(/^ws:\/\/example\.com\/ws\/story\/s1$/)
  })

  it('getWsUrl encodes session id', () => {
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'x' },
    })
    expect(getWsUrl('a/b')).toContain('a%2Fb')
  })
})
