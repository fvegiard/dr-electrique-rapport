#!/usr/bin/env node
/**
 * Visual Check Script - Captures screenshots and extracts visual info
 * Usage: node scripts/visual-check.js <url> [output-path]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function visualCheck(url, outputPath = './screenshot.png') {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro size
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();

  console.log(`\n📸 Visual Check: ${url}\n`);
  console.log('='.repeat(50));

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract visual info
    const info = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);

      // Get all visible text sections
      const headers = Array.from(document.querySelectorAll('h1, h2, h3, .font-bebas'))
        .map(el => el.textContent?.trim())
        .filter(Boolean)
        .slice(0, 10);

      // Get form elements
      const inputs = document.querySelectorAll('input, select, textarea');
      const buttons = document.querySelectorAll('button');

      // Get color scheme
      const bgColor = computedStyle.backgroundColor;
      const textColor = computedStyle.color;

      // Check for key UI elements
      const hasPhotosSection = !!document.querySelector('[class*="photo"], [class*="camera"]');
      const hasTimeInputs = !!document.querySelector('[class*="time"], input[type="time"]');
      const hasSections = document.querySelectorAll('[class*="glass"], [class*="section"], .rounded-2xl').length;

      // Get page dimensions
      const scrollHeight = Math.max(
        body.scrollHeight,
        document.documentElement.scrollHeight
      );

      return {
        title: document.title,
        headers,
        inputCount: inputs.length,
        buttonCount: buttons.length,
        bgColor,
        textColor,
        hasPhotosSection,
        hasTimeInputs,
        sectionCount: hasSections,
        pageHeight: scrollHeight,
        bodyClasses: body.className,
      };
    });

    console.log(`📄 Title: ${info.title}`);
    console.log(`🎨 Background: ${info.bgColor}`);
    console.log(`📝 Text Color: ${info.textColor}`);
    console.log(`📊 Page Height: ${info.pageHeight}px`);
    console.log(`\n📋 Headers found:`);
    info.headers.forEach((h, i) => console.log(`   ${i + 1}. ${h}`));
    console.log(`\n🔢 Form Elements:`);
    console.log(`   - Inputs: ${info.inputCount}`);
    console.log(`   - Buttons: ${info.buttonCount}`);
    console.log(`   - Sections: ${info.sectionCount}`);
    console.log(`\n✅ Key Features:`);
    console.log(`   - Photos Section: ${info.hasPhotosSection ? '✓' : '✗'}`);
    console.log(`   - Time Inputs: ${info.hasTimeInputs ? '✓' : '✗'}`);

    // Check for errors
    const errors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[class*="error"], .text-red-500');
      return Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean);
    });

    if (errors.length > 0) {
      console.log(`\n❌ Errors Found:`);
      errors.forEach(e => console.log(`   - ${e}`));
    }

    // Take screenshot
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`\n📸 Screenshot saved: ${outputPath}`);

    // Get file size
    const stats = fs.statSync(outputPath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Visual check complete\n');

    return info;

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    throw error;
  } finally {
    await browser.close();
  }
}

// CLI
const url = process.argv[2] || 'https://dr-electrique-rapport.netlify.app';
const output = process.argv[3] || './visual-check.png';

visualCheck(url, output).catch(console.error);
