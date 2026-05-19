import { test, expect } from '@playwright/test'

test('landing shows the hero and routes the primary cta to /login', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /ship the thing/i })).toBeVisible()

  const cta = page.getByRole('link', { name: /start building/i })
  await expect(cta).toBeVisible()

  await cta.click()
  await expect(page).toHaveURL(/\/login$/)
})
