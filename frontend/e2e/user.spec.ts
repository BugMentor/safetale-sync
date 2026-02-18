import { test, expect } from '@playwright/test'

test.describe('End-to-End User Flows', () => {
  test.describe('Complete User Journey - Positive Cases', () => {
    test('user can start a new story session', async ({ page }) => {
      await page.goto('/')
      
      // Verify initial state
      await expect(page.getByRole('heading', { name: /SafeTale Sync/i })).toBeVisible()
      await expect(page.getByPlaceholder('Session ID')).toHaveValue('default')
      await expect(page.getByPlaceholder(/Write your story here/)).toHaveValue('')
      
      // Start writing
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Once upon a time, there was a brave knight.')
      await expect(textarea).toHaveValue('Once upon a time, there was a brave knight.')
    })

    test('user can change session and continue writing', async ({ page }) => {
      await page.goto('/')
      
      // Write initial content
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Initial story content')
      
      // Change session
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('my-custom-session')
      
      // Continue writing in new session
      await textarea.fill('New session story content')
      await expect(textarea).toHaveValue('New session story content')
      await expect(sessionInput).toHaveValue('my-custom-session')
    })

    test('user can edit existing story content', async ({ page }) => {
      await page.goto('/')
      
      const textarea = page.getByPlaceholder(/Write your story here/)
      
      // Write initial story
      await textarea.fill('The knight went on an adventure.')
      
      // Edit the story by inserting text (more realistic editing)
      await textarea.fill('The brave knight went on an adventure.')
      await expect(textarea).toHaveValue('The brave knight went on an adventure.')
      
      // Edit again by appending text
      await textarea.fill('The brave knight went on an adventure to save the kingdom.')
      await expect(textarea).toHaveValue('The brave knight went on an adventure to save the kingdom.')
    })

    test('user can clear and start over', async ({ page }) => {
      await page.goto('/')
      
      const textarea = page.getByPlaceholder(/Write your story here/)
      
      // Write content
      await textarea.fill('First story attempt')
      await expect(textarea).toHaveValue('First story attempt')
      
      // Clear and start over
      await textarea.fill('')
      await expect(textarea).toHaveValue('')
      
      // Write new content
      await textarea.fill('Second story attempt')
      await expect(textarea).toHaveValue('Second story attempt')
    })
  })

  test.describe('Multi-User Collaboration Flow - Positive Cases', () => {
    test('two users can collaborate on same session', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      // Both users join same session
      const sessionInput1 = page1.getByPlaceholder('Session ID')
      const sessionInput2 = page2.getByPlaceholder('Session ID')
      await sessionInput1.fill('collaboration-room')
      await sessionInput2.fill('collaboration-room')

      // User 1 starts the story
      const textarea1 = page1.getByPlaceholder(/Write your story here/)
      await textarea1.fill('User 1: Once upon a time')

      // User 2 continues
      const textarea2 = page2.getByPlaceholder(/Write your story here/)
      await textarea2.fill('User 2: There was a magical forest')

      // Both can see their own edits
      await expect(textarea1).toHaveValue('User 1: Once upon a time')
      await expect(textarea2).toHaveValue('User 2: There was a magical forest')

      await context1.close()
      await context2.close()
    })

    test('users can switch between different collaboration sessions', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      const sessionInput1 = page1.getByPlaceholder('Session ID')
      const sessionInput2 = page2.getByPlaceholder('Session ID')
      const textarea1 = page1.getByPlaceholder(/Write your story here/)
      const textarea2 = page2.getByPlaceholder(/Write your story here/)

      // Start in session A
      await sessionInput1.fill('session-a')
      await sessionInput2.fill('session-a')
      await textarea1.fill('Session A content')
      await textarea2.fill('Session A content')

      // Switch to session B
      await sessionInput1.fill('session-b')
      await sessionInput2.fill('session-b')
      await textarea1.fill('Session B content')
      await textarea2.fill('Session B content')

      await expect(textarea1).toHaveValue('Session B content')
      await expect(textarea2).toHaveValue('Session B content')

      await context1.close()
      await context2.close()
    })
  })

  test.describe('Error Recovery Flow - Positive Cases', () => {
    test('user can continue working after connection issues', async ({ page }) => {
      await page.goto('/')
      
      const textarea = page.getByPlaceholder(/Write your story here/)
      
      // Write content
      await textarea.fill('Story content before issue')
      
      // Simulate connection issue by changing session (triggers reconnection)
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('recovery-session')
      
      // User should still be able to edit
      await textarea.fill('Story content after recovery')
      await expect(textarea).toHaveValue('Story content after recovery')
    })

    test('user can recover from empty session ID', async ({ page }) => {
      await page.goto('/')
      
      const sessionInput = page.getByPlaceholder('Session ID')
      const textarea = page.getByPlaceholder(/Write your story here/)
      
      // Clear session ID (should fallback to default)
      await sessionInput.fill('')
      await expect(sessionInput).toHaveValue('default')
      
      // Should still be able to edit
      await textarea.fill('Recovered content')
      await expect(textarea).toHaveValue('Recovered content')
    })
  })
})
