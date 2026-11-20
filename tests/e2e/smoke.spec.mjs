import { test, expect } from '@playwright/test';

test('game tree loads, highlights indexed search results and opens passives', async ({page, isMobile}) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/?perf=1');
  await expect(page.locator('#loading-overlay')).toBeHidden({timeout:45000});
  await expect(page.locator('#scene-count')).toContainText(/[0-9]/);
  await expect(page.locator('.perf-hud')).toBeVisible();
  if (isMobile) await page.locator('#mobile-search').click();
  await page.locator('#search-input').fill('fire');
  await expect(page.locator('.result-item').first()).toBeVisible();
  const expectedId = await page.locator('.result-item').first().getAttribute('data-node-id');
  await page.locator('.result-item').first().click();
  await expect(page.locator('#detail-id')).toHaveText(expectedId);
  await expect(page.locator('#search-navigator')).toBeVisible();
  await page.locator('#search-next').click();
  await expect(page.locator('#search-nav-count')).toContainText('/');
  expect(runtimeErrors).toEqual([]);
});

test('canvas stays available after zoom and drag in real browser', async ({page}) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading-overlay')).toBeHidden({timeout:45000});
  const canvas = page.locator('#tree-canvas');
  await expect(canvas).toBeVisible();
  const dims = await canvas.evaluate(element => ({width:element.width,height:element.height}));
  expect(dims.width).toBeGreaterThan(250);
  expect(dims.height).toBeGreaterThan(250);
  await page.locator('#zoom-in').click();
  await page.locator('#zoom-out').click();
  const bounds = await canvas.boundingBox();
  const x = bounds.x + bounds.width * .55, y = bounds.y + bounds.height * .5;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x-130,y+70,{steps:8});
  await page.mouse.up();
  await page.locator('#fit-all').click();
  expect(runtimeErrors).toEqual([]);
});
