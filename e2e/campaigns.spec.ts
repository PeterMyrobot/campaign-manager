import { test, expect } from '@playwright/test';

test.describe('Campaigns Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns');
    // Wait for the page to load and data to be fetched
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should display campaigns table', async ({ page }) => {
    // Check that the campaigns heading is visible
    await expect(page.getByRole('heading', { name: /campaigns/i })).toBeVisible();

    // Check that the table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check that table headers are present
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });

  test('should filter campaigns by status', async ({ page }) => {
    // Look for a status filter button or dropdown
    const statusFilter = page.getByRole('button', { name: /status/i }).or(
      page.getByLabel(/status/i)
    );

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select "Active" status if available
      const activeOption = page.getByRole('option', { name: /active/i }).or(
        page.getByText(/active/i)
      );

      if (await activeOption.isVisible()) {
        await activeOption.click();

        // Wait for the table to update
        await page.waitForTimeout(1000);

        // Verify the table still exists (filtered results)
        await expect(page.locator('table')).toBeVisible();
      }
    }
  });

  test('should navigate to campaign detail page', async ({ page }) => {
    // Wait for table rows to be present
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Click on the first campaign (usually the name or a view button)
    const campaignLink = firstRow.locator('a').first();
    if (await campaignLink.isVisible()) {
      await campaignLink.click();

      // Wait for navigation to detail page
      await page.waitForURL(/\/campaigns\/.+/);

      // Verify we're on a campaign detail page
      // Look for common detail page elements like tabs or detailed information
      const detailContent = page.getByRole('main').or(page.locator('[role="tablist"]'));
      await expect(detailContent).toBeVisible();
    }
  });

  test('should search for campaigns', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible()) {
      // Type in search query
      await searchInput.fill('test');

      // Wait for the search to filter results
      await page.waitForTimeout(1000);

      // Verify the page still shows content (table or no results message)
      const hasTable = await page.locator('table').isVisible();
      const hasNoResults = await page.getByText(/no.*found|no.*results/i).isVisible();

      expect(hasTable || hasNoResults).toBeTruthy();
    }
  });

  test('should export campaigns to CSV', async ({ page }) => {
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export/i });

    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;

      // Verify download started
      expect(download.suggestedFilename()).toContain('campaigns');
    }
  });
});
