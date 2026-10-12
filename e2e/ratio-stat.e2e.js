// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Share, average and list-total stat tiles, in a browser (screens-ratio-stat).
//
// WHY PLAYWRIGHT: the three tiles must show their figures through the real
// requests (an aggregation value, the object list for the average, the list
// total for a count with a list filter), stubbed here.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a share tile, an average tile and a list-filtered count tile show their figures', async ({ page }) => {
	const seen = { aggregate: [], list: [] }
	await page.route('**/apps/openregister/api/objects/aggregations/pipelinq/ticket/value**', (route) => {
		const url = decodeURIComponent(route.request().url())
		seen.aggregate.push(url)
		const value = url.includes('inTime') ? 46 : 50
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value }) })
	})
	await page.route(/\/apps\/openregister\/api\/objects\/pipelinq\/ticket(\?|$)/, (route) => {
		const url = decodeURIComponent(route.request().url())
		seen.list.push(url)
		const body = url.includes('_limit=1&') || url.endsWith('_limit=1')
			? { results: [], total: 7 }
			: { results: [
					{ occurredAt: '2026-10-01T08:00:00Z', resolvedAt: '2026-10-02T08:00:00Z' },
					{ occurredAt: '2026-10-01T08:00:00Z', resolvedAt: '2026-10-01T20:00:00Z' },
				], total: 2 }
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
	})
	await page.goto('/?ratiostat=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="tile-ratio"]').waitFor({ state: 'visible', timeout: 60_000 })

	await expect(page.locator('[data-testid="tile-ratio"]')).toContainText('92%')
	await expect(page.locator('[data-testid="tile-elapsed"]')).toContainText('0.8 dagen')
	await expect(page.locator('[data-testid="tile-open"]')).toContainText('7')
	// The count with a list filter did not go to the aggregation endpoint.
	expect(seen.aggregate.every((u) => !u.includes('notIn'))).toBe(true)
	expect(seen.list.some((u) => u.includes('status[notIn][]=resolved'))).toBe(true)
})
