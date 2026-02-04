
import { test, expect } from '@playwright/test';
import path from 'path';

test.use({ launchOptions: { slowMo: 1500 } });

test.describe('Live Demo: Rapport Submission', () => {

    test('Fill Form and Verify Dashboard', async ({ page }) => {

        // 1. Go to Report Form
        await page.goto('http://localhost:3001/');

        // Handle "New Report" case if previous one exists
        if (await page.locator('button:has-text("NOUVEAU RAPPORT")').isVisible()) {
            await page.click('button:has-text("NOUVEAU RAPPORT")');
        }

        await expect(page.locator('text=RAPPORT JOURNALIER')).toBeVisible();

        // 2. Fill General Info
        await page.selectOption('select:has-text("Sélectionner...")', { index: 1 }); // Select first project
        await page.fill('input[type="text"][placeholder*="rue"]', '123 Avenue du Test, Demo City');
        await page.locator('.grid.grid-cols-4 button').first().click(); // Select first weather option (Sun)
        await page.fill('input[placeholder="-5"]', '22');
        await page.selectOption('select:has-text("Qui es-tu?")', { label: 'Maxime Robert (Contremaitre)' });

        // 3. Fill Manpower
        await page.selectOption('select:has-text("Sélectionner employé")', { index: 1 });
        await page.fill('input[placeholder="Description des travaux effectués..."]', 'Installation du système de démo live');

        // 4. Add Material
        await page.locator('input[placeholder="Matériau"]').first().fill('Vise #8');
        await page.locator('input[placeholder="Qté"]').first().fill('100');

        // 5. Upload Photos
        // Note: We use the file chooser for hidden inputs if necessary, or intuitive upload
        // Assuming standard file input behavior or locating the upload button
        // The form uses PhotoUploadGPS component. Let's try to find the inputs.
        // Usually file inputs are hidden.

        // Upload Avant
        const fileChooserPromise1 = page.waitForEvent('filechooser');
        await page.locator('button:has-text("AVANT")').click();
        const fileChooser1 = await fileChooserPromise1;
        await fileChooser1.setFiles('/tmp/photo_avant.jpg');

        // Upload Apres
        const fileChooserPromise2 = page.waitForEvent('filechooser');
        await page.locator('button:has-text("APRÈS")').click();
        const fileChooser2 = await fileChooserPromise2;
        await fileChooser2.setFiles('/tmp/photo_apres.jpg');

        // 6. Submit
        await page.click('button:has-text("SIGNER ET ENVOYER")');

        // 7. Success Screen
        await expect(page.locator('text=RAPPORT ENVOYÉ!')).toBeVisible({ timeout: 10000 });

        // 8. Go to Dashboard
        await page.click('button:has-text("RETOUR DASHBOARD")');
        await expect(page).toHaveURL(/.*dashboard/);

        // 9. Verify in Dashboard
        await expect(page.locator('text=Installation du système de démo live')).toBeVisible();
        console.log('Verified report in dashboard!');

        // Pause to let user see
        await page.waitForTimeout(5000);
    });
});
