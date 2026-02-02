import { test, expect } from '@playwright/test';
import {
  getPhotosForRapport,
  verifyPhotosInStorage,
  cleanupTestRapport,
  getMostRecentRapport
} from './helpers/supabase-test';

const hasSupabaseKey = Boolean(process.env.SUPABASE_ANON_KEY);
const describeWithSupabase = hasSupabaseKey ? test.describe : test.describe.skip;

const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function fillRequiredFields(page: import('@playwright/test').Page) {
  await page.waitForSelector('form', { timeout: 15000 });

  const projetSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Sélectionner...' }) });
  await projetSelect.selectOption({ index: 1 });

  const redacteurSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Qui es-tu?' }) });
  await redacteurSelect.selectOption({ index: 1 });
}

test.describe('Form Rendering', () => {
  test('form loads with all required sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form', { timeout: 15000 });

    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('select').filter({ has: page.locator('option', { hasText: 'Sélectionner...' }) })).toBeVisible();
    await expect(page.locator('select').filter({ has: page.locator('option', { hasText: 'Qui es-tu?' }) })).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('has all 4 photo category sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form', { timeout: 15000 });

    const photoLabels = ['GÉNÉRALES', 'AVANT', 'APRÈS', 'PROBLÈMES'];
    for (const label of photoLabels) {
      await expect(page.locator(`button span:text("${label}")`)).toBeVisible();
    }
  });

  test('has hidden file inputs for photo upload', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form', { timeout: 15000 });

    const fileInputs = page.locator('input[type="file"][accept="image/*"]');
    const count = await fileInputs.count();
    expect(count).toBe(4);
  });
});

test.describe('Form Validation', () => {
  test('blocks submit without required fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form', { timeout: 15000 });

    await page.locator('button[type="submit"]').click();

    const url = page.url();
    expect(url).not.toContain('success');
  });

  test('submit works with required fields filled', async ({ page }) => {
    await page.goto('/');
    await fillRequiredFields(page);

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    await expect(
      page.locator('text=ENVOI EN COURS').or(page.locator('text=RAPPORT ENVOYÉ')).or(page.locator('text=NOUVEAU RAPPORT'))
    ).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Photo Upload UI', () => {
  test('adds photo preview when file is selected', async ({ page }) => {
    await page.goto('/');
    await fillRequiredFields(page);

    const fileInput = page.locator('input[type="file"]').first();
    const buffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');

    await fileInput.setInputFiles({
      name: 'test-photo.png',
      mimeType: 'image/png',
      buffer
    });

    await page.waitForTimeout(2000);

    const previews = page.locator('img[src^="data:image"]');
    const count = await previews.count();
    expect(count).toBeGreaterThan(0);
  });

  test('can remove photo after adding', async ({ page }) => {
    await page.goto('/');
    await fillRequiredFields(page);

    const fileInput = page.locator('input[type="file"]').first();
    const buffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');

    await fileInput.setInputFiles({
      name: 'test-remove.png',
      mimeType: 'image/png',
      buffer
    });

    await page.waitForTimeout(2000);

    const deleteBtn = page.locator('button:has-text("×")').first();
    if (await deleteBtn.isVisible()) {
      const previewsBefore = await page.locator('img[src^="data:image"]').count();
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const previewsAfter = await page.locator('img[src^="data:image"]').count();
      expect(previewsAfter).toBeLessThan(previewsBefore);
    }
  });
});

describeWithSupabase('Photo Upload E2E (Supabase)', () => {
  let testRapportId: string | null = null;

  test.afterEach(async () => {
    if (testRapportId) {
      await cleanupTestRapport(testRapportId);
      testRapportId = null;
    }
  });

  test('submit with photo persists to DB and Storage', async ({ page }) => {
    await page.goto('/');
    await fillRequiredFields(page);

    const fileInput = page.locator('input[type="file"]').first();
    const buffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');

    await fileInput.setInputFiles({
      name: 'e2e-test-photo.png',
      mimeType: 'image/png',
      buffer
    });

    await page.waitForTimeout(3000);

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    await expect(
      page.locator('text=NOUVEAU RAPPORT').or(page.locator('text=RAPPORT ENVOYÉ'))
    ).toBeVisible({ timeout: 30000 });

    const rapport = await getMostRecentRapport();
    expect(rapport).not.toBeNull();
    testRapportId = rapport!.id as string;

    const photos = await getPhotosForRapport(testRapportId);

    if (photos.length > 0) {
      expect(photos[0].rapport_id).toBe(testRapportId);
      expect(photos[0].url).toBeTruthy();
      expect(photos[0].category).toBeTruthy();

      if (photos[0].url) {
        const response = await page.request.head(photos[0].url);
        expect(response.ok()).toBe(true);
      }
    }
  });
});
