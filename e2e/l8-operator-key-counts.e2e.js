// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A quick-filter lens that spells its operator in the key counts what the
// list shows (screens-operator-key-lens-counts).
//
// WHY PLAYWRIGHT: the count is the product of the real page, the real token
// resolution and the real request it chooses. The aggregation endpoint is
// stubbed to answer 0, as OpenRegister does for a key it takes as a field
// name, so a lens counted there reads 0.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('date lenses with the operator in the key count through the list endpoint, a plain lens still through an aggregate', async ({ page }) => {
	const seen = { aggregate: [], list: [] }
	await page.route('**/apps/openregister/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) }))
	await page.route('**/apps/openregister/api/objects/aggregations/**', (route) => {
		seen.aggregate.push(decodeURIComponent(route.request().url()))
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: 0 }) })
	})
	await page.route(/\/apps\/openregister\/api\/objects\/decidiq\/meeting(\?|$)/, (route) => {
		const url = decodeURIComponent(route.request().url())
		seen.list.push(url)
		const rows = [1, 2, 3, 4, 5].map((n) => ({ id: String(n), title: 'Vergadering ' + n }))
		let total = 0
		if (url.includes('lifecycle=closed')) {
			total = 4
		} else if (url.includes('scheduledDate[lt]=')) {
			total = 2
		} else if (url.includes('scheduledDate[gte]=')) {
			total = 5
		}
		if (!/_limit=1(&|$)/.test(url)) {
			// The page's own list request.
			return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: rows, total: 5, page: 1, pages: 1 }) })
		}
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total }) })
	})
	await page.goto('/?l8=operator-counts', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="operator-counts"]')
	await host.waitFor({ state: 'visible', timeout: 60_000 })

	await expect(host.getByRole('button', { name: /Komende/ })).toContainText('5')
	await expect(host.getByRole('button', { name: /Deze maand/ })).toContainText('2')
	await expect(host.getByRole('button', { name: /Afgerond/ })).toBeVisible()

	// No date lens went to an aggregation endpoint, and the token was resolved
	// before the list request.
	expect(seen.aggregate.some((u) => u.includes('scheduledDate'))).toBe(false)
	const upcoming = seen.list.find((u) => u.includes('scheduledDate[gte]=') && !u.includes('scheduledDate[lt]='))
	expect(upcoming).toBeTruthy()
	expect(upcoming).not.toContain('@today')
	expect(upcoming).toMatch(/_limit=1(&|$)/)
	// The plain equality lens is still answered by the aggregation endpoint.
	await expect.poll(() => seen.aggregate.some((u) => u.includes('lifecycle'))).toBe(true)
})
