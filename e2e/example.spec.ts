import { test, expect } from '@playwright/test';

test.describe('Campaign Manager - Basic Navigation', () => {
  test('should display the dashboard page', async ({ page }) => {
    await page.goto('/');

    // Check that the page title is visible
    await expect(page).toHaveTitle('campaign-manager');

    // Check that the dashboard heading is visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should navigate to campaigns page', async ({ page }) => {
    await page.goto('/');

    // Click on the Campaigns navigation link
    await page.getByRole('link', { name: /campaigns/i }).first().click();

    // Wait for navigation to complete
    await page.waitForURL('**/campaigns');

    // Check that we're on the campaigns page
    await expect(page.getByRole('heading', { name: /campaigns/i })).toBeVisible();
  });

  test('should navigate to invoices page', async ({ page }) => {
    await page.goto('/');

    // Click on the Invoices navigation link
    await page.getByRole('link', { name: /invoices/i }).first().click();

    // Wait for navigation to complete
    await page.waitForURL('**/invoices');

    // Check that we're on the invoices page
    await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();
  });

  test('should navigate to line items page', async ({ page }) => {
    await page.goto('/');

    // Click on the Line Items navigation link
    await page.getByRole('link', { name: /line items/i }).first().click();

    // Wait for navigation to complete
    await page.waitForURL('**/line-items');

    // Check that we're on the line items page
    await expect(page.getByRole('heading', { name: /line items/i })).toBeVisible();
  });
});
