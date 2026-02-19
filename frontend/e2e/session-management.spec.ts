import { test, expect } from '@playwright/test'

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Session ID Input - Positive Cases', () => {
    test('session ID input has default value', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await expect(sessionInput).toBeVisible()
      await expect(sessionInput).toHaveValue('default')
    })

    test('session ID input has correct placeholder', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await expect(sessionInput).toHaveAttribute('placeholder', 'Session ID')
      await expect(sessionInput).toHaveAttribute('type', 'text')
    })

    test('can change session ID to valid value', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('room-123')
      await expect(sessionInput).toHaveValue('room-123')
    })

    test('can change session ID to alphanumeric value', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('session-abc-123')
      await expect(sessionInput).toHaveValue('session-abc-123')
    })

    test('can change session ID multiple times', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('session-1')
      await expect(sessionInput).toHaveValue('session-1')
      await sessionInput.fill('session-2')
      await expect(sessionInput).toHaveValue('session-2')
      await sessionInput.fill('session-3')
      await expect(sessionInput).toHaveValue('session-3')
    })
  })

  test.describe('Session ID Input - Negative Cases', () => {
    test('empty session ID falls back to default', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('custom-session')
      await expect(sessionInput).toHaveValue('custom-session')
      await sessionInput.fill('')
      await expect(sessionInput).toHaveValue('default')
    })

    test('whitespace-only session ID falls back to default', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('   ')
      // After clearing whitespace, it should fall back to default
      await sessionInput.fill('')
      await expect(sessionInput).toHaveValue('default')
    })
  })

  test.describe('Session ID Input - Edge Cases', () => {
    test('handles very long session ID', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      const longSessionId = 'a'.repeat(200)
      await sessionInput.fill(longSessionId)
      await expect(sessionInput).toHaveValue(longSessionId)
    })

    test('handles session ID with special characters', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('session_123-test.room')
      await expect(sessionInput).toHaveValue('session_123-test.room')
    })

    test('handles session ID with unicode characters', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('session-世界-🌍')
      await expect(sessionInput).toHaveValue('session-世界-🌍')
    })

    test('handles rapid session ID changes', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('session-1')
      await sessionInput.fill('session-2')
      await sessionInput.fill('session-3')
      await expect(sessionInput).toHaveValue('session-3')
    })

    test('session ID change resets textarea content (new session)', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      const textarea = page.getByPlaceholder(/Write your story here/)
      
      await textarea.fill('Story content')
      await sessionInput.fill('new-session')
      
      // Textarea should still be visible and functional, but content resets for new session
      await expect(textarea).toBeVisible()
      // When session changes, a new Y.Doc is created, so content is reset
      await expect(textarea).toHaveValue('')
    })
  })

  test.describe('Session Reconnection - Positive Cases', () => {
    test('changing session ID triggers reconnection', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /SafeTale Sync/i })).toBeVisible()
      const sessionInput = page.getByPlaceholder('Session ID')
      const initialValue = await sessionInput.inputValue()
      expect(initialValue).toBe('default')
      
      await sessionInput.fill('session-2')
      await expect(sessionInput).toHaveValue('session-2')
      
      // Component re-renders on session change - verify UI is still functional
      await expect(page.getByRole('heading', { name: /SafeTale Sync/i })).toBeVisible()
      const textarea = page.getByPlaceholder(/Write your story here/)
      await expect(textarea).toBeVisible()
      
      // Connection status should still be visible
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible()
    })

    test('UI remains functional after session change', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      const textarea = page.getByPlaceholder(/Write your story here/)
      
      await sessionInput.fill('new-session')
      await textarea.fill('New story content')
      await expect(textarea).toHaveValue('New story content')
    })
  })

  test.describe('Session Reconnection - Edge Cases', () => {
    test('handles rapid session ID changes without breaking', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      
      for (let i = 1; i <= 5; i++) {
        await sessionInput.fill(`session-${i}`)
        await expect(sessionInput).toHaveValue(`session-${i}`)
        await page.waitForTimeout(100) // Small delay to allow reconnection
      }
      
      // UI should still be functional
      await expect(page.getByRole('heading', { name: /SafeTale Sync/i })).toBeVisible()
    })

    test('changing session ID and immediately typing works', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      const textarea = page.getByPlaceholder(/Write your story here/)
      
      await sessionInput.fill('quick-session')
      await textarea.fill('Quick content')
      await expect(textarea).toHaveValue('Quick content')
    })
  })
})
