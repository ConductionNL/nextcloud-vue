// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An `open-form` action named by a PascalCase schema title opens the create
// form when the register holds the schema under that title as written
// (?l7=open-form-schema-title, harness l7/OpenFormSchemaTitle.vue). The
// kebab form `ap-invoice` answers 404 here, as on shillinq; the title
// `APInvoice` answers 200.
//
// WHY PLAYWRIGHT: the claim is that a real click reaches the real create
// dialog through the real object store's schema request and its fallback.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const SCHEMA = {
	id: 'ap-invoice-schema',
	slug: 'APInvoice',
	title: 'APInvoice',
	properties: { number: { type: 'string', title: 'Factuurnummer' } },
}

test('an open-form action on a schema title opens the create form', async ({ page }) => {
	const schemaRequests = []
	// Broadest first: Playwright checks the newest route first.
	await page.route('**/apps/openregister/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) }))
	await page.route('**/apps/openregister/api/schemas/**', (route) => {
		const url = new URL(route.request().url())
		schemaRequests.push(url.pathname.split('/').pop())
		if (url.pathname.endsWith('/schemas/APInvoice')) {
			return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SCHEMA) })
		}
		return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) })
	})

	await page.goto('/?l7=open-form-schema-title', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const button = page.locator('[data-testid="open-form-schema-title"] [data-testid="cn-index-header-button-new-purchase-invoice"]')
	await button.waitFor({ state: 'visible', timeout: 60_000 })
	await button.click()

	const dialog = page.locator('.modal-container, [role="dialog"]').first()
	await expect(dialog, 'the open-form action should mount the create dialog').toBeVisible({ timeout: 30_000 })
	await expect(dialog).toContainText('Nieuwe inkoopfactuur')
	await expect(dialog).toContainText('Factuurnummer')
	expect(schemaRequests).toEqual(['ap-invoice', 'APInvoice'])
})
