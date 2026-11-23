// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An index header button opens the create form (?l7=index-header-open-form,
// harness l7/IndexHeaderOpenForm.vue), as shillinq's "Nieuwe factuur" over the
// invoice list: a `headerActions` entry of `type: "open-form"` named by a
// primary header button.
//
// WHY PLAYWRIGHT: the claim is that a real click on the header button mounts
// the real create dialog with the schema's fields, fetched from OpenRegister.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const SCHEMA = {
	id: 'invoice',
	slug: 'invoice',
	title: 'Invoice',
	properties: { number: { type: 'string', title: 'Factuurnummer' } },
}

test('the "Nieuwe factuur" header button opens the create form', async ({ page }) => {
	// Broadest first: Playwright checks the newest route first.
	await page.route('**/apps/openregister/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) }))
	await page.route('**/apps/openregister/api/schemas/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SCHEMA) }))

	await page.goto('/?l7=index-header-open-form', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const button = page.locator('[data-testid="index-header-open-form"] [data-testid="cn-index-header-button-new-invoice"]')
	await button.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(button).toHaveText(/Nieuwe factuur/)
	await button.click()

	const dialog = page.locator('.modal-container, [role="dialog"]').first()
	await expect(dialog, 'the open-form header action should mount the create dialog').toBeVisible({ timeout: 30_000 })
	await expect(dialog).toContainText('Nieuwe factuur')
	await expect(dialog).toContainText('Factuurnummer')
})
