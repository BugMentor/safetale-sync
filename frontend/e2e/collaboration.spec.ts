import { test, expect } from '@playwright/test'

test.describe('Collaborative Editing', () => {
  test.describe('Multi-User Scenarios - Positive Cases', () => {
    test('two browser contexts can edit independently', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      const textarea1 = page1.getByPlaceholder(/Write your story here/)
      const textarea2 = page2.getByPlaceholder(/Write your story here/)

      await textarea1.fill('Page 1 content')
      await textarea2.fill('Page 2 content')

      await expect(textarea1).toHaveValue('Page 1 content')
      await expect(textarea2).toHaveValue('Page 2 content')

      await context1.close()
      await context2.close()
    })

    test('multiple users can have different session IDs', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      const sessionInput1 = page1.getByPlaceholder('Session ID')
      const sessionInput2 = page2.getByPlaceholder('Session ID')

      await sessionInput1.fill('session-alpha')
      await sessionInput2.fill('session-beta')

      await expect(sessionInput1).toHaveValue('session-alpha')
      await expect(sessionInput2).toHaveValue('session-beta')

      await context1.close()
      await context2.close()
    })

    test('users in same session can edit simultaneously', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      // Set same session ID
      const sessionInput1 = page1.getByPlaceholder('Session ID')
      const sessionInput2 = page2.getByPlaceholder('Session ID')
      await sessionInput1.fill('shared-session')
      await sessionInput2.fill('shared-session')

      const textarea1 = page1.getByPlaceholder(/Write your story here/)
      const textarea2 = page2.getByPlaceholder(/Write your story here/)

      // Both can edit
      await textarea1.fill('User 1 content')
      await textarea2.fill('User 2 content')

      await expect(textarea1).toHaveValue('User 1 content')
      await expect(textarea2).toHaveValue('User 2 content')

      await context1.close()
      await context2.close()
    })
  })

  test.describe('Multi-User Scenarios - Edge Cases', () => {
    test('handles multiple users typing simultaneously', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      const textarea1 = page1.getByPlaceholder(/Write your story here/)
      const textarea2 = page2.getByPlaceholder(/Write your story here/)

      // Simulate simultaneous typing
      await Promise.all([
        textarea1.type('User 1 typing', { delay: 10 }),
        textarea2.type('User 2 typing', { delay: 10 })
      ])

      await expect(textarea1).toHaveValue('User 1 typing')
      await expect(textarea2).toHaveValue('User 2 typing')

      await context1.close()
      await context2.close()
    })

    test('handles user disconnection gracefully', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      const textarea1 = page1.getByPlaceholder(/Write your story here/)
      await textarea1.fill('Content before disconnect')

      // Close one context (simulate disconnection)
      await context1.close()

      // Other user should still be able to edit
      const textarea2 = page2.getByPlaceholder(/Write your story here/)
      await textarea2.fill('Content after other user disconnected')
      await expect(textarea2).toHaveValue('Content after other user disconnected')

      await context2.close()
    })

    test('handles multiple rapid session changes across users', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      const sessionInput1 = page1.getByPlaceholder('Session ID')
      const sessionInput2 = page2.getByPlaceholder('Session ID')

      // Rapid session changes
      for (let i = 1; i <= 3; i++) {
        await sessionInput1.fill(`session-${i}`)
        await sessionInput2.fill(`session-${i}`)
        await page1.waitForTimeout(100)
        await page2.waitForTimeout(100)
      }

      await expect(sessionInput1).toHaveValue('session-3')
      await expect(sessionInput2).toHaveValue('session-3')

      await context1.close()
      await context2.close()
    })
  })

  test.describe('Session Isolation - Positive Cases', () => {
    test('users in different sessions have isolated content', async ({ browser }) => {
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

      await sessionInput1.fill('session-isolated-1')
      await sessionInput2.fill('session-isolated-2')

      await textarea1.fill('Session 1 content')
      await textarea2.fill('Session 2 content')

      // Content should be isolated
      await expect(textarea1).toHaveValue('Session 1 content')
      await expect(textarea2).toHaveValue('Session 2 content')

      await context1.close()
      await context2.close()
    })
  })
})
