/**
 * Compute a single insert or delete operation between two strings (for Yjs sync).
 */
export function diffStrings(
  prev: string,
  next: string
): { type: 'insert' | 'delete'; index: number; value: string } | null {
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
