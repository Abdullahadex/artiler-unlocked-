import { test, expect } from '@playwright/test';

test.describe('Auction Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('user can view auctions on the floor', async ({ page }) => {
    await page.goto('/floor');
    await expect(page.locator('h1')).toContainText('The Floor');
  });

  test('user can navigate to auction detail page', async ({ page }) => {
    await page.goto('/floor');
    
    // Wait for auctions to load
    const firstAuction = page.locator('.masonry-item').first();
    await expect(firstAuction).toBeVisible();
    
    await firstAuction.click();
    
    // Should navigate to detail page
    await expect(page).toHaveURL(/\/piece\/[a-f0-9-]+/);
  });

  test('user must sign in to place bid', async ({ page }) => {
    await page.goto('/floor');
    
    // Click first auction
    await page.locator('.masonry-item').first().click();
    
    // Try to place bid
    const bidButton = page.getByRole('button', { name: /place bid/i });
    if (await bidButton.isVisible()) {
      await bidButton.click();
      
      // Should show sign in prompt
      await expect(page.locator('text=/sign in/i')).toBeVisible();
    }
  });

  test('user can sign up', async ({ page }) => {
    await page.goto('/auth');
    
    // Switch to sign up
    await page.getByText(/sign up/i).click();
    
    // Fill form
    await page.fill('input[type="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[name="displayName"]', 'Test User');
    
    // Submit
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Should redirect or show success
    await expect(page).toHaveURL(/\/floor|\/vault/);
  });
});

