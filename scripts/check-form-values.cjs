#!/usr/bin/env node
const { chromium } = require('playwright');

async function checkFormValues() {
  console.log('\n🔍 Checking Form Default Values\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    await page.goto('https://dr-electrique-rapport.netlify.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Extract all form values
    const formValues = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      const inputs = document.querySelectorAll('input');

      const values = {};

      selects.forEach((select, i) => {
        const label = select.previousElementSibling?.textContent?.trim() || `Select ${i}`;
        values[label] = {
          value: select.value,
          selectedText: select.options[select.selectedIndex]?.text || 'N/A'
        };
      });

      inputs.forEach((input, i) => {
        if (input.type !== 'file' && input.type !== 'hidden') {
          const label = input.closest('div')?.querySelector('label')?.textContent?.trim() ||
                       input.placeholder || `Input ${i}`;
          values[label] = input.value;
        }
      });

      return values;
    });

    console.log('='.repeat(50));
    console.log('📋 Form Default Values:');
    console.log('='.repeat(50));

    Object.entries(formValues).forEach(([key, val]) => {
      if (typeof val === 'object') {
        console.log(`${key}: ${val.selectedText} (${val.value})`);
      } else if (val) {
        console.log(`${key}: ${val}`);
      }
    });

    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

checkFormValues();
