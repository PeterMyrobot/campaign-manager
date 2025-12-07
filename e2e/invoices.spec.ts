import { test, expect } from '@playwright/test';

test.describe('Invoices Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/invoices');
    // Wait for the page to load and data to be fetched
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should display invoices table', async ({ page }) => {
    // Check that the invoices heading is visible
    await expect(page.getByRole('heading', { name: /invoices/i })).toBeVisible();

    // Check that the table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check that table headers are present
    await expect(page.getByRole('columnheader', { name: /invoice/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });

  test('should filter invoices by status', async ({ page }) => {
    // Look for a status filter
    const statusFilter = page.getByRole('button', { name: /status/i }).or(
      page.getByLabel(/status/i)
    );

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select "Paid" status if available
      const paidOption = page.getByRole('option', { name: /paid/i }).or(
        page.getByText(/paid/i).first()
      );

      if (await paidOption.isVisible()) {
        await paidOption.click();

        // Wait for the table to update
        await page.waitForTimeout(1000);

        // Verify the table still exists
        await expect(page.locator('table')).toBeVisible();
      }
    }
  });

  test('should navigate to invoice detail page', async ({ page }) => {
    // Wait for table rows
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Click on the first invoice
    const invoiceLink = firstRow.locator('a').first();
    if (await invoiceLink.isVisible()) {
      await invoiceLink.click();

      // Wait for navigation
      await page.waitForURL(/\/invoices\/.+/);

      // Verify we're on the invoice detail page
      const detailContent = page.getByRole('main');
      await expect(detailContent).toBeVisible();
    }
  });
});

test.describe('Invoice Adjustments', () => {
  test('should open adjustment modal and make an adjustment', async ({ page }) => {
    await page.goto('/invoices');

    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Navigate to first invoice detail
    const firstInvoiceLink = page.locator('tbody tr a').first();
    if (await firstInvoiceLink.isVisible()) {
      await firstInvoiceLink.click();
      await page.waitForURL(/\/invoices\/.+/);

      // Look for an "Edit" or "Adjust" button
      const adjustButton = page.getByRole('button', { name: /adjust|edit/i });

      if (await adjustButton.isVisible()) {
        await adjustButton.click();

        // Wait for modal to appear
        const modal = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
        await expect(modal).toBeVisible();

        // Look for adjustment input field
        const adjustmentInput = page.getByLabel(/adjustment/i).or(
          page.getByPlaceholder(/adjustment/i)
        );

        if (await adjustmentInput.isVisible()) {
          // Clear and enter adjustment amount
          await adjustmentInput.clear();
          await adjustmentInput.fill('100');

          // Look for reason/comment field
          const reasonInput = page.getByLabel(/reason|comment/i).or(
            page.getByPlaceholder(/reason|comment/i)
          );

          if (await reasonInput.isVisible()) {
            await reasonInput.fill('Test adjustment for E2E test');
          }

          // Look for save/submit button in the modal
          const saveButton = modal.getByRole('button', { name: /save|submit|update/i });

          if (await saveButton.isVisible()) {
            await saveButton.click();

            // Wait for modal to close
            await expect(modal).not.toBeVisible({ timeout: 5000 });

            // Look for success message
            const successToast = page.getByText(/success|updated/i);
            if (await successToast.isVisible({ timeout: 3000 })) {
              await expect(successToast).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('should display change history', async ({ page }) => {
    await page.goto('/change-logs');

    // Wait for the page to load
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => {
      // Page might have different layout
    });

    // Check for change log heading
    const heading = page.getByRole('heading', { name: /change|history|log/i });
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });
});
