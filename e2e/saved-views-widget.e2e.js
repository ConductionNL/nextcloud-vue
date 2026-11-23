// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The saved-views card, in a browser (screens-own-saved-views).
//
// WHY PLAYWRIGHT: the card reads two real requests (the Views API and one count
// per view) and draws links in the board's weight and colour; both are
// stubbed here. The harness has no router, so the entries are text.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the card lists only the reader\'s own views of the source, with counts, one under the other', async ({ page }) => {
	// @nextcloud/auth reads the user off <head data-user> once, so it is set
	// before any script runs.
	await page.addInitScript(() => {
		const observer = new MutationObserver(() => {
			if (document.head) {
				document.head.setAttribute('data-user', 'pieter')
				observer.disconnect()
			}
		})
		observer.observe(document, { childList: true, subtree: true })
	})
	await page.route('**/apps/openregister/api/views', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({
			results: [
				{ id: 1, name: 'Van mij, alle statussen', owner: 'pieter', query: { schemas: ['ticket'], filters: { assignee: 'pieter' } } },
				{ id: 2, name: 'Van mij, opgelost', owner: 'pieter', query: { schemas: ['ticket'], filters: { status: 'resolved' } } },
				{ id: 3, name: 'Van een collega', owner: 'sanne', query: { schemas: ['ticket'], filters: {} } },
				{ id: 4, name: 'Mijn leads', owner: 'pieter', query: { schemas: ['lead'], filters: {} } },
			],
			total: 4,
		}),
	}))
	await page.route(/\/apps\/openregister\/api\/objects\/pipelinq\/ticket\?/, (route) => {
		const url = decodeURIComponent(route.request().url())
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: url.includes('status=resolved') ? 23 : 9 }) })
	})
	await page.goto('/?l4=saved-views', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const links = page.locator('[data-testid="cn-saved-views-link"]')
	await links.first().waitFor({ state: 'visible', timeout: 60_000 })
	await expect(links).toHaveText(['Van mij, alle statussen (9)', 'Van mij, opgelost (23)'])

	const rects = await links.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))
	expect(rects[1].y).toBeGreaterThan(rects[0].y + rects[0].height - 1)
	const weight = await links.first().evaluate((el) => getComputedStyle(el).fontWeight)
	expect(Number(weight)).toBeGreaterThanOrEqual(600)
})
