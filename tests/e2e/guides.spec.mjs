import { test, expect } from '@playwright/test';

test('Korean build guides work on desktop and touch browsers without affecting the passive planner', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/guides.html?build=spark');
  await expect(page.locator('#guide-title')).toHaveText('스파크 스톰위버');
  await expect(page.locator('#guide-choices .guide-choice')).toHaveCount(5);
  await page.locator('#section-gems').click();
  await expect(page.locator('#guide-panel')).toContainText('폭풍의 보주');
  await page.locator('#guide-choices .guide-choice').nth(1).click();
  await expect(page.locator('#guide-title')).toHaveText('아이스 노바 크로노맨서');
  await page.locator('#section-leveling').click();
  await page.locator('.guide-stage-button').nth(1).click();
  await expect(page.locator('.guide-stage-body')).toContainText('2막');
  await page.locator('#section-check').click();
  const checklist = page.locator('.guide-check-row input').first();
  await checklist.check();
  await expect(checklist).toBeChecked();
  await page.reload();
  await page.locator('#section-check').click();
  await expect(page.locator('.guide-check-row input').first()).toBeChecked();
  await page.locator('.guide-header-links a').first().click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#tab-passive')).toBeVisible();
  expect(errors).toEqual([]);
});
