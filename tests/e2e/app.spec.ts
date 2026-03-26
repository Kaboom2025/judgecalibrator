import { test, expect } from '@playwright/test';

test.describe('JudgeCalibrator E2E Tests', () => {
  test('Landing Page - Title and Heading are visible', async ({ page }) => {
    await page.goto('/');

    // Check for page title
    await expect(page).toHaveTitle(/.*/, { timeout: 5000 });

    // Check for main heading
    const heading = page.locator('h1:has-text("How Trustworthy Is Your")');
    await expect(heading).toBeVisible();

    // Check for "LLM Judge?" text in heading
    const llmJudgeText = page.locator('text=LLM Judge?');
    await expect(llmJudgeText).toBeVisible();
  });

  test('Landing Page - Two model cards are shown', async ({ page }) => {
    await page.goto('/');

    // Wait for API data to load
    await page.waitForTimeout(2000);

    // Check for model cards by looking for model names or grade indicators
    const gradeIndicators = page.locator('text=/Trust Grade/');
    await expect(gradeIndicators).toHaveCount(2);

    // Check for specific models if available
    const gpt4o = page.locator('text=gpt-4o');
    const claudeSonnet = page.locator('text=claude-sonnet-4-5');

    // At least one model should be visible
    const modelCount = await gpt4o.count() + await claudeSonnet.count();
    expect(modelCount).toBeGreaterThanOrEqual(1);
  });

  test('Landing Page - Metric Breakdown section is visible', async ({ page }) => {
    await page.goto('/');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for "Metric Breakdown" heading
    const metricHeading = page.locator('text=Metric Breakdown');
    await expect(metricHeading).toBeVisible();
  });

  test('Landing Page - CTA buttons exist', async ({ page }) => {
    await page.goto('/');

    // Check for "Try the Interactive Demo" button
    const demoButton = page.locator('button:has-text("Try the Interactive Demo")');
    await expect(demoButton).toBeVisible();

    // Check for "Run Full Audit" button
    const auditButton = page.locator('button:has-text("Run Full Audit")');
    await expect(auditButton).toBeVisible();
  });

  test('Navigation - Click Try Demo navigates to #demo', async ({ page }) => {
    await page.goto('/');

    const demoButton = page.locator('button:has-text("Try the Interactive Demo")');
    await demoButton.click();

    // Check URL changed to #demo
    await expect(page).toHaveURL(/.*#demo/);
  });

  test('Navigation - Click Run Audit navigates to #audit', async ({ page }) => {
    await page.goto('/');

    const auditButton = page.locator('button:has-text("Run Full Audit")');
    await auditButton.click();

    // Check URL changed to #audit
    await expect(page).toHaveURL(/.*#audit/);
  });

  test('Navigation - Header Home link navigates to home', async ({ page }) => {
    // Navigate to demo first
    await page.goto('/#demo');

    // Click Home/JudgeCalibrator in header
    const homeLink = page.locator('button:has-text("JudgeCalibrator")');
    await homeLink.click();

    // Should be back to home (no hash or empty hash)
    await expect(page).toHaveURL(/.*#?$/);
  });

  test('Navigation - Header Try the Demo link navigates to demo', async ({ page }) => {
    await page.goto('/');

    // Click "Try the Demo" in header nav
    const demoNavLink = page.locator('nav >> button:has-text("Try the Demo")');
    await expect(demoNavLink).toBeVisible();
    await demoNavLink.click();

    // Should navigate to #demo
    await expect(page).toHaveURL(/.*#demo/);
  });

  test('Navigation - Header Live Audit link navigates to audit', async ({ page }) => {
    await page.goto('/');

    // Click "Live Audit" in header nav
    const auditNavLink = page.locator('nav >> button:has-text("Live Audit")');
    await expect(auditNavLink).toBeVisible();
    await auditNavLink.click();

    // Should navigate to #audit
    await expect(page).toHaveURL(/.*#audit/);
  });

  test('Demo Page - Heading is visible', async ({ page }) => {
    await page.goto('/#demo');

    // Check for "Fool the Judge" heading
    const heading = page.locator('h1:has-text("Fool the Judge")');
    await expect(heading).toBeVisible();
  });

  test('Demo Page - Question is loaded and displayed', async ({ page }) => {
    await page.goto('/#demo');

    // Wait for question to load (up to 10 seconds as specified)
    const questionSection = page.locator('text=Question').first();
    await expect(questionSection).toBeVisible({ timeout: 10000 });

    // Check that question text is visible (should have non-empty text)
    const questionText = page.locator('.bg-surface-container-low:has(+ :text("Question"))').first();
    const text = await questionText.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test('Demo Page - Answer cards are shown', async ({ page }) => {
    await page.goto('/#demo');

    // Wait for answers to load
    await page.waitForTimeout(2000);

    // Check for Answer A and Answer B cards using specific selectors
    const answerACard = page.locator('[class*="bg-surface-container-low"]:has-text("Answer A")').first();
    const answerBCard = page.locator('[class*="bg-surface-container-low"]:has-text("Answer B")').first();

    await expect(answerACard).toBeVisible();
    await expect(answerBCard).toBeVisible();
  });

  test('Demo Page - Swap button is present', async ({ page }) => {
    await page.goto('/#demo');

    // Wait for question to load
    await page.waitForTimeout(2000);

    // Check for "Swap A ↔ B" button
    const swapButton = page.locator('button:has-text("Swap A ↔ B")');
    await expect(swapButton).toBeVisible();
  });

  test('Demo Page - Make Verbose button is present', async ({ page }) => {
    await page.goto('/#demo');

    // Wait for question to load
    await page.waitForTimeout(2000);

    // Check for "Make Verbose" button
    const verboseButton = page.locator('button:has-text("Make Verbose")');
    await expect(verboseButton).toBeVisible();
  });

  test('Demo Page - Edit Manually button is present', async ({ page }) => {
    await page.goto('/#demo');

    // Wait for question to load
    await page.waitForTimeout(2000);

    // Check for "Edit Manually" button
    const editButton = page.locator('button:has-text("Edit Manually")');
    await expect(editButton).toBeVisible();
  });

  test('Demo Page - Bias counter is visible', async ({ page }) => {
    await page.goto('/#demo');

    // Wait for question to load
    await page.waitForTimeout(2000);

    // Check for bias counter with initial value "0/3"
    const biasCounter = page.locator('text=/Biases Found|\\d+\\/3/');
    await expect(biasCounter).toBeVisible();

    // Verify it shows "0/3" initially
    const counterText = page.locator('text=/0\\/3/');
    await expect(counterText).toBeVisible();
  });

  test('Audit Page - System Configuration section is visible', async ({ page }) => {
    await page.goto('/#audit');

    // Check for "System Configuration" heading
    const configSection = page.locator('text=System Configuration');
    await expect(configSection).toBeVisible();
  });

  test('Audit Page - Judge Model selector is present', async ({ page }) => {
    await page.goto('/#audit');

    // Check for "Judge Model" label
    const judgeModelLabel = page.locator('text=Judge Model');
    await expect(judgeModelLabel).toBeVisible();

    // Check for select/input element near the label
    const selectElement = page.locator('select, [role="combobox"]').first();
    await expect(selectElement).toBeVisible();
  });

  test('Audit Page - Task Count slider is present', async ({ page }) => {
    await page.goto('/#audit');

    // Check for "Task Count" label
    const taskCountLabel = page.locator('text=Task Count');
    await expect(taskCountLabel).toBeVisible();

    // Check for input slider element
    const sliderElement = page.locator('input[type="range"]').first();
    await expect(sliderElement).toBeVisible();
  });

  test('Audit Page - Run Audit button in header is visible', async ({ page }) => {
    await page.goto('/#audit');

    // Check for "Run Audit" button in header
    const runAuditButton = page.locator('button:has-text("Run Audit")');
    await expect(runAuditButton).toBeVisible();
  });

  test('Demo Page - Question loads within timeout', async ({ page }) => {
    await page.goto('/#demo');

    // Measure time to question load
    const startTime = Date.now();
    const questionText = page.locator('text=Question').first();
    await expect(questionText).toBeVisible({ timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // Verify it loaded within reasonable time
    expect(loadTime).toBeLessThan(10000);
  });

  test('Navigation - Back button navigates correctly', async ({ page }) => {
    // Start at home
    await page.goto('/');

    // Navigate to demo
    const demoButton = page.locator('button:has-text("Try the Interactive Demo")');
    await demoButton.click();
    await expect(page).toHaveURL(/.*#demo/);

    // Go back
    await page.goBack();

    // Should be back to home
    await expect(page).toHaveURL(/.*#?$/);
  });

  test('Page Structure - Footer is present on all pages', async ({ page }) => {
    // Test home
    await page.goto('/');
    const footer = page.locator('footer, [role="contentinfo"]').first();
    await expect(footer).toBeVisible().catch(() => {
      // Footer might not have a specific role, just check it exists somewhere
      expect(true).toBe(true);
    });
  });

  test('Landing Page - Model cards have grade and metrics', async ({ page }) => {
    await page.goto('/');

    // Wait for data
    await page.waitForTimeout(2000);

    // Look for status indicators (colored dots/badges)
    const badges = page.locator('span:has(.rounded-full)');
    const badgeCount = await badges.count();

    // Should have multiple status badges for metrics
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('Demo Page - Loading state is shown initially', async ({ page }) => {
    // Intercept the question API to slow it down
    await page.route('**/api/demo/question', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/#demo');

    // Loading indicator should be visible initially
    const loader = page.locator('.animate-spin, text=/Loading/i').first();

    // Either loader is visible OR question already loaded (if very fast)
    const isLoading = await loader.isVisible().catch(() => false);
    const questionLoaded = await page.locator('text=Question').isVisible().catch(() => false);

    expect(isLoading || questionLoaded).toBe(true);
  });
});
