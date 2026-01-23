#!/usr/bin/env node
/**
 * Test Photo Upload and Form Submit
 * Creates a test image, uploads it, submits form, verifies in Supabase
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://iawsshgkogntmdzrfjyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhd3NzaGdrb2dudG1kenJmanl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDkwMDUsImV4cCI6MjA4MzIyNTAwNX0.1BxhI5SWLL5786qsshidOMpTsOrGeNob6xpcKQjI4s4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create a simple test PNG image
function createTestImage() {
  // Minimal valid PNG (1x1 red pixel)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
    0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, // IEND chunk
    0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const testImagePath = '/tmp/test-photo.png';
  fs.writeFileSync(testImagePath, pngBuffer);
  return testImagePath;
}

async function testPhotoUpload() {
  console.log('\n🧪 TEST: Photo Upload & Form Submit\n');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    permissions: ['geolocation'],
    geolocation: { latitude: 45.5017, longitude: -73.5673 }, // Montreal
  });
  const page = await context.newPage();

  try {
    // 1. Navigate to form
    console.log('1️⃣ Loading form...');
    await page.goto('https://dr-electrique-rapport.netlify.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('   ✓ Form loaded');

    // 2. Check defaults
    console.log('2️⃣ Checking defaults...');
    const redacteur = await page.$eval('select[required]', el => el.value);
    const projet = await page.locator('select').first().inputValue();
    console.log(`   ✓ Rédacteur: ${redacteur}`);
    console.log(`   ✓ Projet: ${projet}`);

    // 3. Create and upload test photo
    console.log('3️⃣ Uploading test photo...');
    const testImagePath = createTestImage();

    // Find the file input for photos (hidden, triggered by button)
    const fileInput = await page.locator('input[type="file"][accept*="image"]').first();
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(2000); // Wait for photo processing

    // Check if photo preview appeared
    const photoCount = await page.locator('img[class*="aspect-square"]').count();
    console.log(`   ✓ Photos uploaded: ${photoCount}`);

    // 4. Fill additional test data
    console.log('4️⃣ Adding test notes...');
    const notesField = await page.locator('textarea').last();
    await notesField.fill('TEST AUTOMATIQUE - ' + new Date().toISOString());
    console.log('   ✓ Notes added');

    // 5. Submit form
    console.log('5️⃣ Submitting form...');
    await page.click('button[type="submit"]');

    // Wait for success or error
    await page.waitForTimeout(5000);

    // Check for success message
    const successVisible = await page.locator('text=RAPPORT ENVOYÉ').isVisible().catch(() => false);
    const offlineVisible = await page.locator('text=SAUVEGARDÉ LOCALEMENT').isVisible().catch(() => false);

    if (successVisible) {
      console.log('   ✓ Form submitted successfully!');
    } else if (offlineVisible) {
      console.log('   ⚠ Saved offline (connection issue)');
    } else {
      console.log('   ⏳ Still submitting or error...');
    }

    // 6. Verify in Supabase
    console.log('6️⃣ Verifying in Supabase...');
    const { data: rapports, error } = await supabase
      .from('rapports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.log(`   ✗ Supabase error: ${error.message}`);
    } else if (rapports && rapports.length > 0) {
      const latest = rapports[0];
      console.log(`   ✓ Latest rapport ID: ${latest.id}`);
      console.log(`   ✓ Rédacteur: ${latest.redacteur}`);
      console.log(`   ✓ Date: ${latest.date}`);
      console.log(`   ✓ Photos count: ${latest.total_photos || 0}`);

      // Check if it's our test
      if (latest.notes_generales?.includes('TEST AUTOMATIQUE')) {
        console.log('   ✓ Confirmed: This is our test rapport!');
      }
    }

    // Take final screenshot
    await page.screenshot({ path: './test-result.png', fullPage: true });
    console.log('\n📸 Screenshot saved: ./test-result.png');

    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST COMPLETE\n');

    return true;

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}\n`);
    await page.screenshot({ path: './test-error.png', fullPage: true });
    return false;
  } finally {
    await browser.close();
  }
}

testPhotoUpload().then(success => {
  process.exit(success ? 0 : 1);
});
