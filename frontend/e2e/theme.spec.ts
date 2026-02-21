import { test, expect } from '@playwright/test'

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should toggle dark mode', async ({ page }) => {
    // Check initial state (should be light or based on system, but we can check the class)
    const html = page.locator('html')
    const themeButton = page.getByLabel('Toggle theme')

    // Toggle to dark
    await themeButton.click()
    await expect(html).toHaveClass(/dark/)

    // Toggle back to light
    await themeButton.click()
    await expect(html).not.toHaveClass(/dark/)
  })

  test('should persist theme preference after reload', async ({ page }) => {
    const html = page.locator('html')
    const themeButton = page.getByLabel('Toggle theme')

    // Set to dark
    await themeButton.click()
    await expect(html).toHaveClass(/dark/)

    // Reload
    await page.reload()
    await expect(html).toHaveClass(/dark/)

    // Set to light
    await themeButton.click()
    await expect(html).not.toHaveClass(/dark/)

    // Reload
    await page.reload()
    await expect(html).not.toHaveClass(/dark/)
  })
})
