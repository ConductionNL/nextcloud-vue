// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A record list on a dashboard reads its rows from an app endpoint
// (?l7=l16-bank-accounts, harness l7/L16BankAccounts.vue), as board ShBank's
// accounts read their balances from the cash position.
//
// WHY PLAYWRIGHT: the real dashboard, registry, record list and endpoint
// engine over a request the browser makes.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the accounts come from the endpoint, with name, IBAN and balance', async ({ page }) => {
	let openRegister = 0
	await page.route('**/apps/openregister/api/**', (route) => {
		openRegister += 1
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) })
	})
	await page.route('**/apps/shillinq/api/v1/cash-position**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ total: 508384.38, accounts: [
			{ id: 'a1', name: 'ING zakelijk', iban: 'NL12 INGB 0001 2345 67', balance: 412380.16 },
			{ id: 'a2', name: 'Rabobank', iban: 'NL44 RABO 0123 4567 89', balance: 96004.22 },
		] }),
	}))
	await page.goto('/?l7=l16-bank-accounts', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="l16-bank-accounts"]')
	const titles = host.locator('.cn-record-list__title')
	await expect(titles).toHaveText(['ING zakelijk', 'Rabobank'], { timeout: 60_000 })
	await expect(host.locator('.cn-record-list__meta').first()).toHaveText('NL12 INGB 0001 2345 67')
	await expect(host.locator('.cn-record-list__trailing').first()).toContainText('412')
	expect(openRegister).toBe(0)
})
