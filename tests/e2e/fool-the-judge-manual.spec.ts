import { test, expect } from '@playwright/test';

test('Fool the Judge demo UI', async ({ page }) => {
  await page.goto('http://localhost:3000/#demo');

  // Heading
  await expect(page.getByRole('heading', { name: 'Fool the Judge' })).toBeVisible({ timeout: 5000 });
  console.log('✓ Heading visible');

  // Onboarding
  await expect(page.getByText('How this demo works')).toBeVisible();
  console.log('✓ Onboarding panel visible');

  // Question block (use exact text to avoid matching "Next Question")
  await expect(page.getByText('Question', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  console.log('✓ Question block visible');

  // Answer cards
  await expect(page.getByText('Answer A').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Answer B').first()).toBeVisible();
  console.log('✓ Both answer cards visible');

  // Wait for evaluation
  await expect(page.getByText('Original Judgment')).toBeVisible({ timeout: 30000 });
  console.log('✓ Judgment panel visible');
  await page.screenshot({ path: 'test-results/ftj-loaded.png', fullPage: true });

  // Hover card to show action bar
  const answerACard = page.locator('[class*="group/card"]').first();
  await answerACard.hover();
  await page.waitForTimeout(500);
  const verboseBtn = page.getByRole('button', { name: /Make Verbose/ }).first();
  await expect(verboseBtn).toBeVisible();
  console.log('✓ Make Verbose button visible on hover');

  // Click to open dropdown
  await verboseBtn.click();
  await page.waitForTimeout(200);
  await expect(page.getByText('Pad Text (instant)').first()).toBeVisible();
  console.log('✓ Verbose dropdown opened');

  // Move mouse into the dropdown (tests hover gap fix)
  const padBtn = page.getByText('Pad Text (instant)').first();
  await padBtn.hover();
  await page.waitForTimeout(200);
  await expect(padBtn).toBeVisible();
  console.log('✓ Dropdown stays open when hovering options (hover gap bug fixed)');
  await page.screenshot({ path: 'test-results/ftj-verbose.png', fullPage: true });

  // Close dropdown by clicking elsewhere
  await page.mouse.click(50, 50);
  await page.waitForTimeout(200);

  // Edit mode - hover first to reveal Edit button
  await answerACard.hover();
  await page.waitForTimeout(300);
  const editBtn = page.getByRole('button', { name: /^Edit$/ }).first();
  await editBtn.click();
  await page.waitForTimeout(300);
  const textarea = page.locator('textarea').first();
  await expect(textarea).toBeVisible();
  console.log('✓ Edit mode - textarea visible');
  const originalVal = await textarea.inputValue();
  await textarea.fill(originalVal + ' edited');
  await page.waitForTimeout(200);
  await expect(page.getByRole('button', { name: /Re-evaluate/ })).toBeVisible();
  console.log('✓ Re-evaluate button appeared after edit');
  await page.screenshot({ path: 'test-results/ftj-edit.png', fullPage: true });

  // Dismiss onboarding
  await page.getByText('Got it, hide this').click();
  await page.waitForTimeout(300);
  await expect(page.getByText('How this demo works')).not.toBeVisible();
  console.log('✓ Onboarding dismissed');

  // Swap button
  const swapBtn = page.getByRole('button', { name: /Swap A/ });
  await expect(swapBtn).toBeVisible();
  await swapBtn.click();
  await page.waitForTimeout(1000);
  console.log('✓ Swap clicked');
  // Feedback banner should appear after re-evaluation completes
  await expect(page.locator('p').filter({ hasText: /judge|steady/i }).first()).toBeVisible({ timeout: 30000 });
  console.log('✓ Swap feedback banner appeared');
  await page.screenshot({ path: 'test-results/ftj-swap.png', fullPage: true });

  console.log('\nAll checks passed!');
});
