/**
 * Custom Yjs WebSocket provider for SafeTale Sync.
 * Connects to FastAPI /ws/story/{session_id} and syncs Y.Doc via binary messages.
 * Protocol: 0x00 = sync request, 0x01 = Yjs update payload.
 */

import * as Y from 'yjs'

const SYNC_REQUEST = 0x00
const SYNC_UPDATE = 0x01

function getWsUrl(sessionId: string): string {
  const base = import.meta.env.DEV
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  return `${base}/ws/story/${encodeURIComponent(sessionId)}`
}

export function createStoryProvider(sessionId: string, doc: Y.Doc): {
  connect: () => void
  disconnect: () => void
} {
  let ws: WebSocket | null = null

  const sendUpdate = (update: Uint8Array) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const msg = new Uint8Array(1 + update.length)
    msg[0] = SYNC_UPDATE
    msg.set(update, 1)
    ws.send(msg)
  }

  const requestSync = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(new Uint8Array([SYNC_REQUEST]))
  }

  doc.on('update', (update: Uint8Array) => {
    sendUpdate(update)
  })

  const connect = () => {
    if (ws != null) return
    const url = getWsUrl(sessionId)
    ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      requestSync()
    }

    ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const data = new Uint8Array(event.data)
      if (data.length === 0) return
      const type = data[0]
      if (type === SYNC_REQUEST) {
        const state = Y.encodeStateAsUpdate(doc)
        if (state.length > 0) sendUpdate(state)
        return
      }
      if (type === SYNC_UPDATE) {
        const update = data.subarray(1)
        if (update.length === 0) return
        Y.applyUpdate(doc, update)
      }
    }

    ws.onclose = () => {
      ws = null
    }

    ws.onerror = () => {
      ws = null
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      ws = null
    }
  }

  return { connect, disconnect }
}
