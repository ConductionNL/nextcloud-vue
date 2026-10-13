// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A quick filter sets its own order (screens-quick-filter-sort): Komende reads
// soonest first, Afgerond goes back to the page's newest first.
//
// WHY PLAYWRIGHT: the order is the `_order` of the real list request the page
// sends when a lens is clicked.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('Komende asks for soonest first, Afgerond for the page order', async ({ page }) => {
	const lists = []
	await page.route('**/apps/openregister/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) }))
	await page.route(/\/apps\/openregister\/api\/objects\/decidiq\/meeting(\?|$)/, (route) => {
		lists.push(decodeURIComponent(route.request().url()))
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ id: '1', title: 'Raadsvergadering', scheduledDate: '2026-10-20T19:30:00Z' }], total: 1, page: 1, pages: 1 }) })
	})
	await page.goto('/?l8=lens-order', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="lens-order"]')
	await expect(host.getByText('Raadsvergadering')).toBeVisible({ timeout: 60_000 })

	// `_order` travels as JSON (`_order={"scheduledDate":"asc"}`) or in the bracket form.
	const orderOf = (url) => (url.match(/_order(?:\[scheduledDate\]=|=\{"scheduledDate":")(asc|desc)/) || [])[1]
	const upcoming = lists.filter((u) => u.includes('scheduledDate[gte]='))
	expect(upcoming.length).toBeGreaterThan(0)
	expect(orderOf(upcoming[upcoming.length - 1])).toBe('asc')

	await host.getByRole('button', { name: /Afgerond/ }).click()
	await expect.poll(() => lists.some((u) => u.includes('lifecycle=closed'))).toBe(true)
	const closed = lists.filter((u) => u.includes('lifecycle=closed'))
	expect(orderOf(closed[closed.length - 1])).toBe('desc')
})
