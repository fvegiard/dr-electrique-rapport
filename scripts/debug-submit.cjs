#!/usr/bin/env node
const { chromium } = require('playwright');

async function debugSubmit() {
  console.log('\n🔍 DEBUG: Form Submit with Console Logs\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();

  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture errors
  page.on('pageerror', err => {
    logs.push(`[PAGE ERROR] ${err.message}`);
  });

  // Capture network
  page.on('requestfailed', req => {
    logs.push(`[NET FAIL] ${req.url()} - ${req.failure()?.errorText}`);
  });

  try {
    console.log('Loading form...');
    await page.goto('https://dr-electrique-rapport.netlify.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Adding test note...');
    const notesTextarea = page.locator('textarea').last();
    await notesTextarea.fill('DEBUG-TEST-' + Date.now());

    console.log('Clicking submit...');
    await page.click('button[type="submit"]');

    console.log('Waiting for response...');
    await page.waitForTimeout(10000);

    console.log('\n📋 Console Logs:');
    console.log('='.repeat(50));
    logs.forEach(log => console.log(log));
    console.log('='.repeat(50));

    // Check page state
    const content = await page.content();
    if (content.includes('RAPPORT ENVOYÉ')) {
      console.log('\n✅ UI shows: SUCCESS');
    } else if (content.includes('SAUVEGARDÉ')) {
      console.log('\n⚠️ UI shows: OFFLINE');
    } else if (content.includes('ENVOI EN COURS')) {
      console.log('\n⏳ UI shows: STILL SUBMITTING');
    } else {
      console.log('\n❓ UI shows: UNKNOWN STATE');
    }

    await page.screenshot({ path: './debug-result.png', fullPage: true });
    console.log('\n📸 Screenshot: ./debug-result.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugSubmit();
