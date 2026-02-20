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

      // Use different sessions to ensure independence
      await page1.getByPlaceholder('Session ID').fill(`indep-1-${Math.random()}`)
      await page2.getByPlaceholder('Session ID').fill(`indep-2-${Math.random()}`)

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

      const s1 = `alpha-${Math.random()}`
      const s2 = `beta-${Math.random()}`
      await sessionInput1.fill(s1)
      await sessionInput2.fill(s2)

      await expect(sessionInput1).toHaveValue(s1)
      await expect(sessionInput2).toHaveValue(s2)

      await context1.close()
      await context2.close()
    })

    test('users in same session can collaborate', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      await page1.goto('/')
      await page2.goto('/')

      // Set same session ID
      const sharedSession = `shared-${Math.random()}`
      const sessionInput1 = page1.getByPlaceholder('Session ID')
      const sessionInput2 = page2.getByPlaceholder('Session ID')
      await sessionInput1.fill(sharedSession)
      await sessionInput2.fill(sharedSession)

      const textarea1 = page1.getByPlaceholder(/Write your story here/)
      const textarea2 = page2.getByPlaceholder(/Write your story here/)

      // User 1 types
      await textarea1.fill('Hello from User 1')
      
      // Both should see it
      await expect(textarea1).toHaveValue('Hello from User 1')
      await expect(textarea2).toHaveValue('Hello from User 1')

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
      
      const sharedSession = `simultaneous-${Math.random()}`
      const sessionInput1 = page1.getByPlaceholder('Session ID')
      const sessionInput2 = page2.getByPlaceholder('Session ID')
      await sessionInput1.fill(sharedSession)
      await sessionInput2.fill(sharedSession)

      const textarea1 = page1.getByPlaceholder(/Write your story here/)
      const textarea2 = page2.getByPlaceholder(/Write your story here/)

      // Wait for both to be synced before typing
      await expect(page1.getByText('Synced')).toBeVisible()
      await expect(page2.getByText('Synced')).toBeVisible()

      // Simulate simultaneous typing by having both type different things
      await textarea1.pressSequentially('A')
      await textarea2.pressSequentially('X')

      // Wait for both characters to appear on both pages (Yjs merge)
      await expect(textarea1).toHaveValue(/A/)
      await expect(textarea1).toHaveValue(/X/)
      await expect(textarea2).toHaveValue(/A/)
      await expect(textarea2).toHaveValue(/X/)

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
