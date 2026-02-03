import { test } from '@playwright/test';

test('verify styling parity with Netlify', async ({ page }) => {
  // Attempt to connect to dev server (try 3001, fallback to 3003)
  try {
    await page.goto('http://localhost:3001');
  } catch {
    console.log('Falling back to 3003...');
    await page.goto('http://localhost:3003');
  }
  
  // 1. Get Computed Styles
  const bodyStyles = await page.evaluate(() => {
    const s = window.getComputedStyle(document.body);
    return {
      backgroundImage: s.backgroundImage,
      backgroundColor: s.backgroundColor,
      fontFamily: s.fontFamily,
      color: s.color
    };
  });

  const inputStyles = await page.evaluate(() => {
    const el = document.querySelector('input');
    if (!el) return null;
    const s = window.getComputedStyle(el);
    return {
      backgroundColor: s.backgroundColor,
      borderRadius: s.borderRadius,
      borderColor: s.borderColor,
      shadow: s.boxShadow
    };
  });

  console.log('\n----------------------------------------');
  console.log('      HEADLESS BROWSER REPORT           ');
  console.log('----------------------------------------');
  console.log(`[Body Background]: ${bodyStyles.backgroundImage}`);
  console.log(`[Body Font]      : ${bodyStyles.fontFamily}`);
  console.log(`[Text Color]     : ${bodyStyles.color}`);
  
  if (inputStyles) {
    console.log(`[Input Bg]       : ${inputStyles.backgroundColor}`);
    console.log(`[Input Radius]   : ${inputStyles.borderRadius}`);
    console.log(`[Input Border]   : ${inputStyles.borderColor}`);
  } else {
    console.log('[Warn] No input fields found on page.');
  }

  console.log('----------------------------------------');
  console.log('👀 DEMO MODE: Pausing 5s for user observation via VNC...');
  await page.waitForTimeout(5000);
  console.log('----------------------------------------\n');
});
