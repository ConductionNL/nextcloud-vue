// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A money amount in a record-list template and in a table cell, in a browser
// (screens-currency-format).

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('an amount reads as money in a template and in a cell, in the currency asked for', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/pipelinq/lead**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 'a', title: 'Dakkapel', value: 12000 }], total: 1 }),
	}))
	await page.goto('/?l6=currency-format', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const trailing = page.locator('.cn-record-list__trailing')
	await trailing.first().waitFor({ state: 'visible', timeout: 60_000 })
	const text = (await trailing.first().innerText()).replace(/ /g, ' ')
	expect(text).toContain('€')
	expect(text).toMatch(/12[.,\s]?000[.,]00/)

	const cell = (await page.locator('.l6-money-cell').innerText()).replace(/ /g, ' ')
	expect(cell).toMatch(/\$|USD/)
	expect(cell).toMatch(/2[.,\s]?500[.,]00/)
})
