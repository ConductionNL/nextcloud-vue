// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A due date as text with a tone, in a record list and a table cell
// (screens-due-text): overdue in the danger colour, today, the empty text.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('overdue is red text, today and the empty text read as configured', async ({ page }) => {
	const day = (n) => {
		const d = new Date()
		d.setDate(d.getDate() + n)
		return d.toISOString()
	}
	await page.route('**/apps/openregister/api/objects/pipelinq/ticket**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({
			results: [
				{ id: 'a', title: 'Te laat', deadline: day(-3) },
				{ id: 'b', title: 'Vandaag', deadline: day(0) },
				{ id: 'c', title: 'Geen', deadline: null },
			],
			total: 3,
		}),
	}))
	await page.goto('/?l6=due-text', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const dues = page.locator('[data-testid="cn-record-list-due"]')
	await dues.first().waitFor({ state: 'visible', timeout: 60_000 })

	await expect(dues.nth(0)).toHaveText(/^(3|4) (days overdue|dagen te laat)$/)
	await expect(dues.nth(1)).toHaveText('Vandaag')
	await expect(dues.nth(2)).toHaveText('Geen deadline')
	// Overdue is in the error colour, not the body colour.
	const colour = (loc) => loc.evaluate((el) => getComputedStyle(el).color)
	expect(await colour(dues.nth(0))).not.toBe(await colour(dues.nth(1)))

	const cell = page.locator('.l6-due-cell [data-testid="cn-cell-renderer-due"]')
	await expect(cell).toHaveText(/^(3|4) (days overdue|dagen te laat)$/)
})
