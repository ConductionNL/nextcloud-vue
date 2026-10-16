// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A board-look wizard opened with spawnDialog shows one close button
// (?l7=l16-spawned-wizard, harness l7/L16SpawnedWizard.vue), as shillinq's
// Generate invoices dialog (board ShFactuurGenereren).
//
// WHY PLAYWRIGHT: whether a button is drawn is computed style on a dialog
// teleported out of a separately mounted app.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the spawned board wizard has one close button, and it closes the dialog', async ({ page }) => {
	await page.goto('/?l7=l16-spawned-wizard', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="l16-open-wizard"]').waitFor({ timeout: 60_000 })
	// As in an app: NcButton's scoped style (one class and its data-v
	// attribute) is loaded after the library's, when the spawned dialog's chunk arrives.
	await page.addStyleTag({ content: '.button-vue.modal-container__close { display: flex; }' })
	await page.locator('[data-testid="l16-open-wizard"]').click()
	const dialog = page.getByRole('dialog')
	await expect(dialog).toBeVisible()
	await expect(dialog.getByText('Kies een klant')).toBeVisible()
	const closes = dialog.getByRole('button', { name: /close|sluiten/i })
	await expect(closes.filter({ visible: true })).toHaveCount(1)
	await closes.filter({ visible: true }).first().click()
	await expect(page.getByRole('dialog')).toHaveCount(0)
})
