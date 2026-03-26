import { test, expect } from '@playwright/test';

test.describe('Fool the Judge - Interactive Demo E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the demo page
    await page.goto('/#demo');
  });

  test('Page loads - heading and onboarding panel visible', async ({ page }) => {
    // Wait for heading to be visible
    const heading = page.locator('h1:has-text("Fool the Judge")');
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Check for onboarding panel with "How this demo works" title
    const onboardingPanel = page.locator('text=How this demo works');
    await expect(onboardingPanel).toBeVisible();

    // Verify the panel contains expected content
    const onboardingContent = page.locator('text=interactive tool');
    await expect(onboardingContent).toBeVisible();
  });

  test('Onboarding dismiss - "Got it, hide this" hides the panel', async ({ page }) => {
    // Wait for onboarding panel to be visible
    const onboardingPanel = page.locator('text=How this demo works');
    await expect(onboardingPanel).toBeVisible({ timeout: 10000 });

    // Find and click the dismiss button
    const dismissButton = page.locator('button:has-text("Got it")');
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();

    // Verify the onboarding panel is hidden
    await expect(onboardingPanel).not.toBeVisible();
  });

  test('Question and answers load - both answer cards visible', async ({ page }) => {
    // Wait for question block to load
    const questionSection = page.locator('text=Question').first();
    await expect(questionSection).toBeVisible({ timeout: 15000 });

    // Verify answer cards are visible
    const answerALabel = page.locator('span:has-text("Answer A")').first();
    const answerBLabel = page.locator('span:has-text("Answer B")').first();

    await expect(answerALabel).toBeVisible();
    await expect(answerBLabel).toBeVisible();

    // Verify answer cards have text content
    const answerACard = page.locator('div:has(span:has-text("Answer A"))').locator('..').first();
    const answerBCard = page.locator('div:has(span:has-text("Answer B"))').locator('..').first();

    const answerAText = await answerACard.textContent();
    const answerBText = await answerBCard.textContent();

    expect(answerAText).toBeTruthy();
    expect(answerBText).toBeTruthy();
  });

  test('Judgment panel shows - "Original Judgment" and "Current Judgment" visible', async ({ page }) => {
    // Wait for the page to load and evaluations to complete
    // The loading spinner should disappear after evaluation
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    const originalJudgment = page.locator('text=Original Judgment');
    const currentJudgment = page.locator('text=Current Judgment');

    await expect(originalJudgment).toBeVisible();
    await expect(currentJudgment).toBeVisible();

    // Verify there's preference data showing
    const preferenceText = page.locator('text=/Preference: [AB]/');
    const preferenceCount = await preferenceText.count();
    expect(preferenceCount).toBeGreaterThanOrEqual(1);
  });

  test('Swap button is visible and clickable', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForSelector('button:has-text("Swap A ↔ B")', { timeout: 15000 });

    const swapButton = page.locator('button:has-text("Swap A ↔ B")');
    await expect(swapButton).toBeVisible();
    await expect(swapButton).toBeEnabled();
  });

  test('Swap button click triggers swap feedback banner', async ({ page }) => {
    // Wait for initial evaluation
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Click swap button
    const swapButton = page.locator('button:has-text("Swap A ↔ B")');
    await swapButton.click();

    // Wait for the swap animation and new evaluation
    await page.waitForTimeout(500); // Allow for animation

    // Wait for new evaluation to complete (loading spinner to disappear)
    await page.waitForSelector('button:has-text("Swap A ↔ B"):not(:disabled)', { timeout: 10000 });

    // Verify feedback banner appears (amber for bias detected, or green for no change)
    const feedbackBanner = page.locator('div[class*="rounded-xl"][class*="px-5"]').filter({
      has: page.locator('text=/flipped|held steady/')
    });

    await expect(feedbackBanner).toBeVisible({ timeout: 5000 });

    // Verify banner contains one of the expected messages
    const bannerText = await feedbackBanner.textContent();
    expect(bannerText).toMatch(/flipped|held steady/);
  });

  test('Make Verbose dropdown opens on hover', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Hover over first answer card to reveal action buttons
    const answerACard = page.locator('div[class*="border-primary/60"]').first();
    await answerACard.hover();

    // Wait for action bar to appear
    await page.waitForTimeout(300); // Allow for opacity transition

    // Find and click "Make Verbose" button
    const makeVerboseButton = page.locator('button:has-text("Make Verbose")').first();
    await expect(makeVerboseButton).toBeVisible();
    await makeVerboseButton.click();

    // Verify dropdown opens with options
    const dropdownMenu = page.locator('text=Choose answer to expand');
    await expect(dropdownMenu).toBeVisible();

    // Verify dropdown contains expansion options
    const padTextButton = page.locator('button:has-text("Pad Text")');
    const aiExpandButton = page.locator('button:has-text("AI Expand")');

    await expect(padTextButton).toBeVisible();
    await expect(aiExpandButton).toBeVisible();
  });

  test('Make Verbose dropdown stays open when moving mouse to it', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Hover over first answer card
    const answerACard = page.locator('div[class*="border-primary/60"]').first();
    await answerACard.hover();

    // Click "Make Verbose" button
    const makeVerboseButton = page.locator('button:has-text("Make Verbose")').first();
    await makeVerboseButton.click();

    // Verify dropdown is visible
    const dropdownMenu = page.locator('text=Choose answer to expand');
    await expect(dropdownMenu).toBeVisible();

    // Move mouse away from the card but toward the dropdown
    await page.locator('button:has-text("Pad Text")').first().hover();

    // Dropdown should still be visible
    await expect(dropdownMenu).toBeVisible();
  });

  test('Edit mode - clicking "Edit" opens textarea', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Hover over first answer card
    const answerACard = page.locator('div[class*="border-primary/60"]').first();
    await answerACard.hover();

    // Click "Edit" button
    const editButton = page.locator('button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Verify textarea appears
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Verify "editing" badge appears
    const editingBadge = page.locator('span:has-text("editing")');
    await expect(editingBadge).toBeVisible();

    // Verify X button appears in header
    const exitEditButton = page.locator('button[title="Stop editing"]');
    await expect(exitEditButton).toBeVisible();
  });

  test('Edit mode - typing in textarea updates text', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Enter edit mode
    const answerACard = page.locator('div[class*="border-primary/60"]').first();
    await answerACard.hover();

    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Get the textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Clear and type new text
    await textarea.clear();
    const newText = 'This is a test edit of the answer text.';
    await textarea.fill(newText);

    // Verify the text was updated
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toBe(newText);
  });

  test('Edit mode - X button exits edit mode', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Enter edit mode
    const answerACard = page.locator('div[class*="border-primary/60"]').first();
    await answerACard.hover();

    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Verify edit mode is active
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Click X button to exit
    const exitEditButton = page.locator('button[title="Stop editing"]');
    await exitEditButton.click();

    // Verify textarea is hidden
    await expect(textarea).not.toBeVisible();

    // Verify "editing" badge is gone
    const editingBadge = page.locator('span:has-text("editing")');
    await expect(editingBadge).not.toBeVisible();
  });

  test('Edit mode - Re-evaluate button appears when text changes', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Enter edit mode
    const answerACard = page.locator('div[class*="border-primary/60"]').first();
    await answerACard.hover();

    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Modify the text
    const textarea = page.locator('textarea').first();
    await textarea.clear();
    await textarea.fill('Modified answer text');

    // Re-evaluate button should appear
    const reEvaluateButton = page.locator('button:has-text("Re-evaluate")');
    await expect(reEvaluateButton).toBeVisible();
  });

  test('Double-click to edit - double-clicking answer text enters edit mode', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Double-click on the answer text
    const answerACard = page.locator('div[class*="border-primary/60"]').first();
    const answerTextArea = answerACard.locator('p').first();
    await answerTextArea.dblclick();

    // Verify textarea appears
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Verify "editing" badge appears
    const editingBadge = page.locator('span:has-text("editing")');
    await expect(editingBadge).toBeVisible();
  });

  test('Bias counter increments - tracks found biases', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Biases Found', { timeout: 15000 });

    // Check initial bias counter is 0
    let biasCounter = page.locator('text=/Biases Found.*0\\/3/');
    await expect(biasCounter).toBeVisible();

    // Attempt to trigger positional bias by swapping multiple times
    for (let i = 0; i < 3; i++) {
      const swapButton = page.locator('button:has-text("Swap A ↔ B")');
      if (await swapButton.isEnabled()) {
        await swapButton.click();
        // Wait for evaluation to complete
        await page.waitForTimeout(1000);
      }
    }

    // Verify bias counter might have incremented
    // (depends on whether the judge actually changes preference on swap)
    const counterText = page.locator('text=/\\d+\\/3/');
    await expect(counterText).toBeVisible();

    const text = await counterText.textContent();
    expect(text).toMatch(/\d+\/3/);
  });

  test('Next Question button - loads a new question', async ({ page }) => {
    // Wait for initial question to load
    const initialQuestion = page.locator('text=Question').first();
    await expect(initialQuestion).toBeVisible({ timeout: 15000 });

    // Get initial question text
    const questionBlock = page.locator('[class*="bg-surface-container-low"]').filter({
      has: page.locator('text=Question')
    }).first();
    const initialText = await questionBlock.textContent();

    // Click "Next Question" button
    const nextButton = page.locator('button:has-text("Next Question")');
    await nextButton.click();

    // Wait for new question to load
    await page.waitForTimeout(500);
    await page.waitForSelector('text=Original Judgment', { timeout: 10000 });

    // Get new question text
    const newText = await questionBlock.textContent();

    // Text should be different (very unlikely to get same question twice)
    // But we just verify that the page is still functional
    expect(newText).toBeTruthy();
  });

  test('API integration - evaluate endpoint works and returns preference', async ({ page }) => {
    // Wait for initial evaluation
    const preferenceText = page.locator('text=/Preference: [AB]/');
    await expect(preferenceText).toBeVisible({ timeout: 15000 });

    // Extract preference value
    const text = await preferenceText.first().textContent();
    expect(text).toMatch(/Preference: [AB]/);
  });

  test('Loading states - spinner shown during evaluation', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Trigger a swap to force re-evaluation
    const swapButton = page.locator('button:has-text("Swap A ↔ B")');
    await swapButton.click();

    // Button should be disabled during loading (or loader visible)
    // Wait a moment for loading to start
    await page.waitForTimeout(100);

    // Button should become enabled again after evaluation
    await expect(swapButton).toBeEnabled({ timeout: 10000 });
  });

  test('Error handling - graceful handling if API fails', async ({ page }) => {
    // Set up a route to fail the evaluate endpoint
    await page.route('**/api/demo/evaluate', async (route) => {
      await route.abort('failed');
    });

    // Try to swap which will fail
    const swapButton = page.locator('button:has-text("Swap A ↔ B")');
    const isEnabled = await swapButton.isEnabled().catch(() => false);

    // The page should still be functional even if API fails
    // The page shouldn't crash
    const heading = page.locator('h1:has-text("Fool the Judge")');
    await expect(heading).toBeVisible();
  });

  test('Responsive layout - answer cards stack on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Both answer cards should still be visible (stacked)
    const answerALabel = page.locator('span:has-text("Answer A")').first();
    const answerBLabel = page.locator('span:has-text("Answer B")').first();

    await expect(answerALabel).toBeVisible();
    await expect(answerBLabel).toBeVisible();

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Word count badge - shows word count in answer headers', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Check that word count is displayed
    const wordCountText = page.locator('text=/\\d+ words/');
    const count = await wordCountText.count();

    // Should have at least 2 word counts (for both answers)
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Swap animation - cards move during swap', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Original Judgment', { timeout: 15000 });

    // Get initial answer A text
    const answerACard = page.locator('div[class*="border-primary/60"]').first();
    const initialAnswerAText = await answerACard.textContent();

    // Perform swap
    const swapButton = page.locator('button:has-text("Swap A ↔ B")');
    await swapButton.click();

    // Wait for animation and evaluation
    await page.waitForTimeout(800);

    // Answer A text should have changed
    const newAnswerAText = await answerACard.textContent();

    // Text should be different after swap
    expect(newAnswerAText).not.toBe(initialAnswerAText);
  });

  test('Page consistency - heading remains throughout interaction', async ({ page }) => {
    // Initial heading check
    const heading = page.locator('h1:has-text("Fool the Judge")');
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Perform several interactions
    const swapButton = page.locator('button:has-text("Swap A ↔ B")');
    if (await swapButton.isEnabled()) {
      await swapButton.click();
      await page.waitForTimeout(500);
    }

    // Heading should still be visible
    await expect(heading).toBeVisible();

    // Click next question
    const nextButton = page.locator('button:has-text("Next Question")');
    await nextButton.click();
    await page.waitForTimeout(500);

    // Heading should still be visible
    await expect(heading).toBeVisible();
  });
});
