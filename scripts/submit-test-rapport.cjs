#!/usr/bin/env node
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://iawsshgkogntmdzrfjyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhd3NzaGdrb2dudG1kenJmanl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDkwMDUsImV4cCI6MjA4MzIyNTAwNX0.1BxhI5SWLL5786qsshidOMpTsOrGeNob6xpcKQjI4s4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_ID = 'TEST-' + Date.now();

async function submitTestRapport() {
  console.log('\n🧪 TEST: Submit Rapport\n');
  console.log('Test ID:', TEST_ID);
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    // 1. Load form
    console.log('1️⃣ Loading form...');
    await page.goto('https://dr-electrique-rapport.netlify.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('   ✓ Form loaded');

    // 2. Add test notes to identify this submission
    console.log('2️⃣ Adding test identifier...');
    const notesTextarea = page.locator('textarea').last();
    await notesTextarea.fill(TEST_ID);
    console.log('   ✓ Test ID added to notes');

    // 3. Submit form
    console.log('3️⃣ Submitting...');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(8000);

    // Check result
    const pageContent = await page.content();
    if (pageContent.includes('RAPPORT ENVOYÉ')) {
      console.log('   ✓ SUCCESS: Form submitted!');
    } else if (pageContent.includes('SAUVEGARDÉ')) {
      console.log('   ⚠ OFFLINE: Saved locally');
    } else {
      console.log('   ? Status unclear, checking Supabase...');
    }

    // 4. Verify in Supabase
    console.log('4️⃣ Checking Supabase...');
    await new Promise(r => setTimeout(r, 2000)); // Wait for DB

    const { data: rapports, error } = await supabase
      .from('rapports')
      .select('*')
      .ilike('notes_generales', `%${TEST_ID}%`)
      .limit(1);

    if (error) {
      console.log(`   ✗ Error: ${error.message}`);
      return false;
    }

    if (rapports && rapports.length > 0) {
      const r = rapports[0];
      console.log('   ✓ FOUND in Supabase!');
      console.log(`   - ID: ${r.id}`);
      console.log(`   - Rédacteur: ${r.redacteur}`);
      console.log(`   - Projet: ${r.projet}`);
      console.log(`   - Date: ${r.date}`);
      console.log(`   - Heures MO: ${r.total_heures_mo}`);
      console.log(`   - Photos: ${r.total_photos}`);
      return true;
    } else {
      console.log('   ✗ NOT found in Supabase');

      // Check latest
      const { data: latest } = await supabase
        .from('rapports')
        .select('id, redacteur, date, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      console.log('\n   Latest rapports in DB:');
      latest?.forEach(r => {
        console.log(`   - ${r.date} by ${r.redacteur} (${r.id.slice(0,8)}...)`);
      });
      return false;
    }

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    await page.screenshot({ path: './submit-error.png' });
    return false;
  } finally {
    await browser.close();
  }
}

submitTestRapport().then(success => {
  console.log('\n' + '='.repeat(50));
  console.log(success ? '✅ TEST PASSED' : '❌ TEST FAILED');
  console.log('='.repeat(50) + '\n');
  process.exit(success ? 0 : 1);
});
