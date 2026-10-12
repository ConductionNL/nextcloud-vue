// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A record-list card on a dashboard shows the header the widget reports
// (?l7=dashboard-list-header, harness l7/DashboardListHeader.vue): the link
// with the list's total filled in and the note beside it. Before, the
// dashboard dropped the widget's `header` event: the link read
// "Alle {total} verzoeken" and the note was not drawn.
//
// WHY PLAYWRIGHT: the total comes from the real list request (stubbed on the
// wire) through the real widget, registry and dashboard page.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a record-list card on a dashboard shows its counted link and note', async ({ page }) => {
	let reads = 0
	await page.route('**/apps/openregister/api/objects/portaliq/portalAccessRequest**', (route) => {
		reads += 1
		return route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ total: 7, results: [{ id: 'r1', displayName: 'R. Mulder' }, { id: 'r2', displayName: 'L. Hendriks' }] }),
		})
	})
	await page.goto('/?l7=dashboard-list-header', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="dashboard-list-header"]')
	await host.locator('.cn-record-list__row').first().waitFor({ state: 'visible', timeout: 60_000 })

	const link = host.locator('[data-testid="cn-widget-wrapper-header-link"]')
	await expect(link).toHaveText('Alle 7 verzoeken')
	await expect(link).toHaveAttribute('href', '#/verzoeken')
	const note = host.locator('[data-testid="cn-dashboard-widget-header-note"]')
	await expect(note).toHaveText('7 in totaal')

	// The note sits in the card header, on the title's row.
	const boxes = await host.evaluate((el) => {
		const title = el.querySelector('.cn-widget-wrapper__title, .cn-widget-wrapper__header').getBoundingClientRect()
		const noteBox = el.querySelector('[data-testid="cn-dashboard-widget-header-note"]').getBoundingClientRect()
		return { titleMid: title.top + title.height / 2, noteMid: noteBox.top + noteBox.height / 2 }
	})
	expect(Math.abs(boxes.titleMid - boxes.noteMid)).toBeLessThan(12)

	// Reporting the header does not make the list read again and again.
	await page.waitForTimeout(1500)
	expect(reads).toBeLessThanOrEqual(2)
})
