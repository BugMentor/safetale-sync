import { describe, it, expect } from 'vitest'
import { diffStrings } from './diffStrings'

describe('diffStrings', () => {
  it('returns null when strings are equal', () => {
    expect(diffStrings('', '')).toBeNull()
    expect(diffStrings('hello', 'hello')).toBeNull()
  })

  it('returns insert at start', () => {
    const r = diffStrings('bar', 'foobar')
    expect(r).toEqual({ type: 'insert', index: 0, value: 'foo' })
  })

  it('returns insert in middle', () => {
    const r = diffStrings('ac', 'abc')
    expect(r).toEqual({ type: 'insert', index: 1, value: 'b' })
  })

  it('returns insert at end', () => {
    const r = diffStrings('foo', 'foobar')
    expect(r).toEqual({ type: 'insert', index: 3, value: 'bar' })
  })

  it('returns delete at start', () => {
    const r = diffStrings('foobar', 'bar')
    expect(r).toEqual({ type: 'delete', index: 0, value: 'foo' })
  })

  it('returns delete in middle', () => {
    const r = diffStrings('abc', 'ac')
    expect(r).toEqual({ type: 'delete', index: 1, value: 'b' })
  })

  it('returns delete at end', () => {
    const r = diffStrings('foobar', 'foo')
    expect(r).toEqual({ type: 'delete', index: 3, value: 'bar' })
  })

  it('returns null when no diff (equal strings)', () => {
    expect(diffStrings('', '')).toBeNull()
    expect(diffStrings('hello', 'hello')).toBeNull()
  })
})
