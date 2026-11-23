// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A tabs widget on a dashboard renders the widgets its tabs name, with a count
// on each tab (?l7=l16-bank-tabs, harness l7/L16BankTabs.vue), as
// board ShBank's Rekeningen / Afschriften strip.
//
// WHY PLAYWRIGHT: the real dashboard page, registry, tabs widget, detail host
// and object table together, over real list requests.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const ROWS = {
	BankAccount: [{ id: 'a1', name: 'ING zakelijk' }, { id: 'a2', name: 'Rabo spaar' }, { id: 'a3', name: 'Bunq' }],
	BankStatement: [{ id: 's1', reference: 'AFS-2026-041' }, { id: 's2', reference: 'AFS-2026-042' }],
}

test('each tab shows its table and its count', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/shillinq/**', (route) => {
		const schema = new URL(route.request().url()).pathname.split('/').pop()
		const rows = ROWS[schema] || []
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: rows, total: rows.length, page: 1, pages: 1 }) })
	})
	await page.goto('/?l7=l16-bank-tabs', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="l16-bank-tabs"]')
	const tabs = root.locator('[role="tab"]')
	await tabs.first().waitFor({ state: 'visible', timeout: 60_000 })
	await expect(root).not.toContainText('No widget found')
	await expect(tabs.nth(0)).toContainText('Rekeningen')
	await expect(tabs.nth(0)).toContainText('3')
	await expect(tabs.nth(1)).toContainText('2')
	await expect(root.locator('.cn-widget-object-table')).toContainText('ING zakelijk')
	await tabs.nth(1).click()
	await expect(root.locator('.cn-widget-object-table').filter({ hasText: 'AFS-2026-042' })).toBeVisible()
})
