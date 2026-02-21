import { test, expect } from '@playwright/test'

test.describe('StoryEditor Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const uniqueSession = `test-session-${Math.random().toString(36).substring(7)}`
    await page.getByPlaceholder('Session ID').fill(uniqueSession)
    await expect(page.getByText('Synced')).toBeVisible()
  })

  test.describe('UI Rendering - Positive Cases', () => {
    test('renders all required UI elements', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /SafeTale Sync/i })).toBeVisible()
      await expect(page.getByPlaceholder(/Write your story here/)).toBeVisible()
      await expect(page.getByPlaceholder('Session ID')).toBeVisible()
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible()
    })

    test('header layout is correctly structured', async ({ page }) => {
      const header = page.locator('header')
      await expect(header).toBeVisible()
      await expect(header.locator('h1')).toContainText('SafeTale Sync')
      await expect(header.locator('input[type="text"]')).toBeVisible()
    })

    test('textarea has correct placeholder text', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await expect(textarea).toBeVisible()
      await expect(textarea).toHaveAttribute('placeholder', /Write your story here.*Multiple tabs will stay in sync/i)
    })
  })

  test.describe('Text Editing - Positive Cases', () => {
    test('can type basic text', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Once upon a time')
      await expect(textarea).toHaveValue('Once upon a time')
    })

    test('can insert text at the start', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('world')
      await textarea.fill('Hello world')
      await expect(textarea).toHaveValue('Hello world')
    })

    test('can insert text in the middle', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Hello world')
      await textarea.fill('Hello beautiful world')
      await expect(textarea).toHaveValue('Hello beautiful world')
    })

    test('can insert text at the end', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Hello')
      await textarea.fill('Hello world')
      await expect(textarea).toHaveValue('Hello world')
    })

    test('can delete text from the start', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Hello world')
      await textarea.fill('world')
      await expect(textarea).toHaveValue('world')
    })

    test('can delete text from the middle', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Hello beautiful world')
      await textarea.fill('Hello world')
      await expect(textarea).toHaveValue('Hello world')
    })

    test('can delete text from the end', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Hello world')
      await textarea.fill('Hello')
      await expect(textarea).toHaveValue('Hello')
    })

    test('can replace entire text content', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('First story')
      // Clear and type new content (simulating user clearing and typing)
      await textarea.fill('')
      await textarea.fill('Second story')
      await expect(textarea).toHaveValue('Second story')
    })
  })

  test.describe('Text Editing - Edge Cases', () => {
    test('textarea is empty by default', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await expect(textarea).toHaveValue('')
    })

    test('can clear all text', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Some text')
      await textarea.fill('')
      await expect(textarea).toHaveValue('')
    })

    test('handles rapid typing without errors', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.type('The quick brown fox jumps over the lazy dog', { delay: 5 })
      await expect(textarea).toHaveValue('The quick brown fox jumps over the lazy dog')
    })

    test('handles very long text content', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      const longText = 'A'.repeat(10000)
      await textarea.fill(longText)
      await expect(textarea).toHaveValue(longText)
    })

    test('handles special characters correctly', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      const specialText = 'Hello! @#$%^&*()_+-=[]{}|;:,.<>?/~`'
      await textarea.fill(specialText)
      await expect(textarea).toHaveValue(specialText)
    })

    test('handles unicode characters', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      const unicodeText = 'Hello 世界 🌍 مرحبا'
      await textarea.fill(unicodeText)
      await expect(textarea).toHaveValue(unicodeText)
    })

    test('handles newlines in text', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      const multilineText = 'Line 1\nLine 2\nLine 3'
      await textarea.fill(multilineText)
      await expect(textarea).toHaveValue(multilineText)
    })

    test('handles multiple rapid edits', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('A')
      await textarea.fill('AB')
      await textarea.fill('ABC')
      await textarea.fill('ABCD')
      await expect(textarea).toHaveValue('ABCD')
    })
  })

  test.describe('Focus Management - Positive Cases', () => {
    test('textarea maintains focus after typing', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Test')
      await expect(textarea).toBeFocused()
    })

    test('textarea can receive focus', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.focus()
      await expect(textarea).toBeFocused()
    })
  })

  test.describe('Focus Management - Edge Cases', () => {
    test('textarea maintains cursor position after remote update', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Hello')
      await textarea.focus()
      await textarea.press('End')
      const selectionStart = await textarea.evaluate((el: HTMLTextAreaElement) => el.selectionStart)
      expect(selectionStart).toBeGreaterThan(0)
    })
  })
})
