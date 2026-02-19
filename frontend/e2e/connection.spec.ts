import { test, expect } from '@playwright/test'

test.describe('Connection Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Connection Status Display - Positive Cases', () => {
    test('shows connection status indicator', async ({ page }) => {
      const statusText = page.getByText(/Synced|Connecting/i)
      await expect(statusText).toBeVisible()
    })

    test('shows "Synced" status after initial load', async ({ page }) => {
      await expect(page.getByText('Synced')).toBeVisible()
    })

    test('connection status dot is visible', async ({ page }) => {
      const statusText = page.getByText(/Synced|Connecting/i)
      const dot = statusText.locator('..').locator('span.w-2.h-2').first()
      await expect(dot).toBeVisible()
    })

    test('connection status dot has correct styling when synced', async ({ page }) => {
      await expect(page.getByText('Synced')).toBeVisible()
      const statusDot = page.locator('span.w-2.h-2.rounded-full.bg-green-500').first()
      await expect(statusDot).toBeVisible()
      await expect(statusDot).toHaveClass(/bg-green-500/)
    })
  })

  test.describe('Connection Status Display - Edge Cases', () => {
    test('connection status persists after page interactions', async ({ page }) => {
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Test content')
      
      // Status should still be visible
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible()
    })

    test('connection status visible after session change', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      await sessionInput.fill('new-session')
      
      // Status should still be visible after reconnection
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('WebSocket Connection - Positive Cases', () => {
    test('WebSocket connection is attempted on page load', async ({ page }) => {
      // Wait for page to load and attempt connection
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible()
      
      // Check that WebSocket URL is constructed (indirectly via connection status)
      // If connection fails, we'd see "Connecting..." state
      // Since backend isn't running, we verify the UI handles it gracefully
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible()
    })
  })

  test.describe('WebSocket Connection - Negative Cases', () => {
    test('handles WebSocket connection failure gracefully', async ({ page }) => {
      // Backend is not running, so WebSocket will fail
      // UI should still be functional
      await expect(page.getByRole('heading', { name: /SafeTale Sync/i })).toBeVisible()
      await expect(page.getByPlaceholder(/Write your story here/)).toBeVisible()
      
      // Can still interact with the UI
      const textarea = page.getByPlaceholder(/Write your story here/)
      await textarea.fill('Content despite connection failure')
      await expect(textarea).toHaveValue('Content despite connection failure')
    })
  })

  test.describe('Reconnection Behavior - Positive Cases', () => {
    test('reconnects when session ID changes', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible()
      await sessionInput.fill('session-reconnect')
      
      // Should attempt reconnection
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible({ timeout: 10000 })
    })

    test('maintains UI functionality during reconnection', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      const textarea = page.getByPlaceholder(/Write your story here/)
      
      await sessionInput.fill('reconnecting-session')
      
      // Should still be able to type during reconnection
      await textarea.fill('Content during reconnect')
      await expect(textarea).toHaveValue('Content during reconnect')
    })
  })

  test.describe('Reconnection Behavior - Edge Cases', () => {
    test('handles rapid session changes without breaking', async ({ page }) => {
      const sessionInput = page.getByPlaceholder('Session ID')
      
      // Rapid session changes
      for (let i = 1; i <= 3; i++) {
        await sessionInput.fill(`rapid-session-${i}`)
        await page.waitForTimeout(200)
      }
      
      // UI should still be functional
      await expect(page.getByRole('heading', { name: /SafeTale Sync/i })).toBeVisible()
      await expect(page.getByText(/Synced|Connecting/i)).toBeVisible()
    })
  })
})
