// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A relative date in a table cell and in a record-list meta line, in a browser
// (screens-relative-dates): "today, 09:42", "yesterday, 23:12", then the short date.
//
// WHY PLAYWRIGHT: the cell and the list render through the real components
// with the real catalogue, and the list request is stubbed here.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a date cell and a record-list meta line read today, yesterday, then a short date', async ({ page }) => {
	const at = (daysAgo, h, m) => {
		const d = new Date()
		d.setDate(d.getDate() - daysAgo)
		d.setHours(h, m, 0, 0)
		return d.toISOString()
	}
	await page.route('**/apps/openregister/api/objects/portaliq/inzending**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({
			results: [
				{ id: 'a', title: 'Melding', app: 'dossiq', submittedAt: at(0, 9, 42) },
				{ id: 'b', title: 'Afval', app: 'pipelinq', submittedAt: at(1, 23, 12) },
				{ id: 'c', title: 'Vergunning', app: 'dossiq', submittedAt: at(4, 8, 5) },
			],
			total: 3,
		}),
	}))
	await page.goto('/?l6=relative-dates', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const cells = page.locator('[data-testid^="cell-"] time')
	await cells.first().waitFor({ state: 'visible', timeout: 60_000 })

	expect(await cells.nth(0).innerText()).toMatch(/^(today|vandaag), 09[.:]42$/)
	expect(await cells.nth(1).innerText()).toMatch(/^(yesterday|gisteren), 23[.:]12$/)
	// Four days back: the short date, no word.
	expect(await cells.nth(2).innerText()).not.toMatch(/today|yesterday|vandaag|gisteren/)
	// The tooltip holds the full date.
	expect(await cells.nth(0).getAttribute('title')).toMatch(/\d{4}/)

	const meta = page.locator('.cn-record-list__meta')
	await meta.first().waitFor({ state: 'visible', timeout: 60_000 })
	expect(await meta.nth(0).innerText()).toMatch(/^dossiq · (today|vandaag), 09[.:]42$/)
	expect(await meta.nth(1).innerText()).toMatch(/^pipelinq · (yesterday|gisteren), 23[.:]12$/)
})
