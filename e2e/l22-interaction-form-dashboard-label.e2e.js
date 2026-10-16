// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The interaction form's submit button on a dashboard reads the host app's
// translation (?l7=interaction-form-in-grid, harness
// l7/InteractionFormInGrid.vue). Before, the dashboard's `content`
// attributes fell through to the form and the button showed the manifest's
// English text, while the channel beside it was Dutch.
//
// WHY PLAYWRIGHT: the claim is the text of the button a real dashboard renders.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the submit button on a dashboard shows the host app\'s translation', async ({ page }) => {
	await page.route('**/apps/openregister/**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [], total: 0 }),
	}))
	await page.goto('/?l7=interaction-form-in-grid', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const form = page.locator('[data-testid="interaction-form-in-grid"] .cn-interaction-form-widget')
	await form.waitFor({ state: 'visible', timeout: 60_000 })

	await expect(form.locator('[data-testid="cn-form-widget-submit"]')).toHaveText('Contactmoment opslaan')
	await expect(form.locator('.cn-form-widget__field').first()).toBeVisible()
})
