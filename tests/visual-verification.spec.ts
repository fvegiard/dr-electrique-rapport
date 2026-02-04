
import { test, expect } from '@playwright/test';

test.describe('Visual Verification', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning')
                console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
        });
        page.on('pageerror', exception => {
            console.log(`[BROWSER EXCEPTION] ${exception}`);
        });
    });

    test('should load Report Form (Home)', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle'); // Wait for network to settle
        // Wait for root to have content if possible, or just log
        console.log('--- REPORT FORM BODY ---');
        console.log((await page.innerHTML('body')).substring(0, 500));
        console.log('------------------------');
    });

    test('should load Dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
    });
});
