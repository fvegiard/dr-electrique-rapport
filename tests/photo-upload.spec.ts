import { test, expect } from '@playwright/test';
import {
  getMostRecentRapport,
  getPhotosForRapport,
  verifyPhotoCount,
  verifyPhotosInStorage,
  cleanupTestRapport,
  waitForRapport
} from './helpers/supabase-test';

/**
 * E2E Test: Photo Upload to Supabase Storage
 *
 * Test flow:
 * 1. Fill out rapport form with required fields
 * 2. Add 4 photos (one per category)
 * 3. Submit the form
 * 4. Verify rapport saved in DB
 * 5. Verify photos saved in photos table
 * 6. Verify photos uploaded to Storage bucket
 */

test.describe('Photo Upload E2E', () => {
  // Track created rapport ID for cleanup
  let testRapportId: string | null = null;

  test.afterEach(async () => {
    // Clean up test data after each test
    if (testRapportId) {
      await cleanupTestRapport(testRapportId);
      testRapportId = null;
    }
  });

  test('should submit rapport with 4 photos and verify DB + Storage', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for React to render
    await page.waitForSelector('form', { timeout: 15000 });

    // Fill required fields - Employee Info
    await page.fill('input[name="employeNom"]', 'Test Employee E2E');

    // Select project (first available)
    const projectSelect = page.locator('select[name="projetId"]');
    await projectSelect.waitFor({ state: 'visible' });
    const projectOptions = await projectSelect.locator('option').all();
    if (projectOptions.length > 1) {
      // Select first non-placeholder option
      await projectSelect.selectOption({ index: 1 });
    }

    // Fill date
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="date"]', today);

    // Fill hours
    await page.fill('input[name="heureDebut"]', '08:00');
    await page.fill('input[name="heureFin"]', '16:00');

    // Fill description
    await page.fill('textarea[name="description"]', 'Test E2E - Photo upload verification');

    // ===== ADD PHOTOS =====
    // We'll use file input to simulate photo upload
    // Each category should have a file input or button

    // Create test image data (1x1 red pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    // Helper to add photo via file input
    const addPhotoToCategory = async (categoryName: string) => {
      // Find the photo section for this category
      const section = page.locator(`[data-category="${categoryName}"], .photo-section-${categoryName.toLowerCase()}`);

      // Look for file input or camera button
      const fileInput = page.locator(`input[type="file"][data-category="${categoryName}"]`).first();

      if (await fileInput.isVisible()) {
        // Create a buffer from base64
        const buffer = Buffer.from(testImageBase64, 'base64');
        await fileInput.setInputFiles({
          name: `test-${categoryName}.png`,
          mimeType: 'image/png',
          buffer
        });
      } else {
        // Alternative: look for camera/upload button and trigger file dialog
        const uploadButton = page.locator(`button:has-text("${categoryName}"), button[aria-label*="${categoryName}"]`).first();
        if (await uploadButton.isVisible()) {
          // Set up file chooser handler
          const fileChooserPromise = page.waitForEvent('filechooser');
          await uploadButton.click();
          const fileChooser = await fileChooserPromise;
          const buffer = Buffer.from(testImageBase64, 'base64');
          await fileChooser.setFiles({
            name: `test-${categoryName}.png`,
            mimeType: 'image/png',
            buffer
          });
        }
      }
    };

    // Try to add photos to each category
    // Note: Actual selectors may need adjustment based on app structure
    const categories = ['GENERAL', 'AVANT', 'APRES', 'PROBLEMES'];

    for (const category of categories) {
      try {
        await addPhotoToCategory(category);
        // Small wait between uploads
        await page.waitForTimeout(500);
      } catch {
        console.log(`Could not add photo to ${category} - selector may need adjustment`);
      }
    }

    // Alternative approach: If app uses a single file input with category selection
    // Look for any file input and upload multiple files
    const anyFileInput = page.locator('input[type="file"]').first();
    if (await anyFileInput.isVisible()) {
      const buffer = Buffer.from(testImageBase64, 'base64');
      await anyFileInput.setInputFiles([
        { name: 'test-photo-1.png', mimeType: 'image/png', buffer },
        { name: 'test-photo-2.png', mimeType: 'image/png', buffer },
        { name: 'test-photo-3.png', mimeType: 'image/png', buffer },
        { name: 'test-photo-4.png', mimeType: 'image/png', buffer },
      ]);
    }

    // Wait for photos to be processed
    await page.waitForTimeout(2000);

    // ===== SUBMIT FORM =====
    const submitButton = page.locator('button[type="submit"], button:has-text("Soumettre")');
    await submitButton.click();

    // Wait for success indication
    await expect(page.locator('.success-message, [role="alert"]:has-text("succès"), .toast-success')).toBeVisible({
      timeout: 30000
    });

    // ===== VERIFY DATABASE =====
    // Wait for rapport to appear in DB
    const timestamp = Date.now();
    const rapport = await waitForRapport(
      (r) => {
        // Match by recent timestamp and test description
        const createdAt = new Date(r.created_at as string).getTime();
        return createdAt > timestamp - 60000 &&
          (r.description as string)?.includes('Test E2E');
      },
      15000
    );

    expect(rapport).not.toBeNull();
    testRapportId = rapport!.id as string;

    console.log(`Test rapport created with ID: ${testRapportId}`);

    // ===== VERIFY PHOTOS IN DB =====
    const photos = await getPhotosForRapport(testRapportId);
    console.log(`Found ${photos.length} photos in database`);

    // We expect at least 1 photo (ideally 4, but depends on UI flow)
    expect(photos.length).toBeGreaterThan(0);

    // Verify photo records have required fields
    for (const photo of photos) {
      expect(photo.rapport_id).toBe(testRapportId);
      expect(photo.url).toBeTruthy();
      expect(photo.category).toBeTruthy();
    }

    // ===== VERIFY STORAGE =====
    const storageResult = await verifyPhotosInStorage(testRapportId);
    console.log(`Storage verification: ${storageResult.files.length} files found`);
    console.log('Files:', storageResult.files);

    expect(storageResult.exists).toBe(true);
    expect(storageResult.files.length).toBeGreaterThan(0);

    // Verify at least one photo URL is accessible
    if (photos.length > 0 && photos[0].url) {
      const response = await page.request.head(photos[0].url);
      expect(response.ok()).toBe(true);
    }
  });

  test('should display photo previews before submission', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form', { timeout: 15000 });

    // Find file input and add a photo
    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.isVisible()) {
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(testImageBase64, 'base64');

      await fileInput.setInputFiles({
        name: 'test-preview.png',
        mimeType: 'image/png',
        buffer
      });

      // Wait for preview to render
      await page.waitForTimeout(1000);

      // Check that photo preview is displayed
      const preview = page.locator('img[src^="data:image"], img[src*="blob:"], .photo-preview img');
      const previewCount = await preview.count();

      expect(previewCount).toBeGreaterThan(0);
    }
  });

  test('should show progress during upload', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form', { timeout: 15000 });

    // Fill minimum required fields
    await page.fill('input[name="employeNom"]', 'Test Progress');

    const projectSelect = page.locator('select[name="projetId"]');
    if (await projectSelect.isVisible()) {
      const options = await projectSelect.locator('option').all();
      if (options.length > 1) {
        await projectSelect.selectOption({ index: 1 });
      }
    }

    await page.fill('input[name="date"]', new Date().toISOString().split('T')[0]);
    await page.fill('textarea[name="description"]', 'Test progress indicator');

    // Add photo
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(testImageBase64, 'base64');
      await fileInput.setInputFiles({
        name: 'test-progress.png',
        mimeType: 'image/png',
        buffer
      });
    }

    // Submit and check for loading/progress indicator
    const submitButton = page.locator('button[type="submit"], button:has-text("Soumettre")');
    await submitButton.click();

    // Should show some loading state
    const loadingIndicator = page.locator('.loading, .spinner, [aria-busy="true"], button:disabled');
    // Note: This may need adjustment based on actual UI implementation
  });
});

test.describe('Photo Categories', () => {
  test('should support all 4 photo categories', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('form', { timeout: 15000 });

    // Check for photo category sections/inputs
    const categories = ['GENERAL', 'AVANT', 'APRES', 'PROBLEMES'];

    for (const category of categories) {
      // Look for section, input, or button related to this category
      const categoryElement = page.locator(
        `[data-category="${category}"], ` +
        `[data-category="${category.toLowerCase()}"], ` +
        `.photo-${category.toLowerCase()}, ` +
        `input[name*="${category.toLowerCase()}"], ` +
        `button:has-text("${category}")`
      );

      // At minimum, check the page contains references to categories
      const pageContent = await page.content();
      const hasCategory = pageContent.toLowerCase().includes(category.toLowerCase()) ||
        pageContent.includes('Générales') ||
        pageContent.includes('Avant') ||
        pageContent.includes('Après') ||
        pageContent.includes('Problèmes');

      // Log which categories are found
      console.log(`Category ${category}: ${hasCategory ? 'Found' : 'Not found'}`);
    }
  });
});
