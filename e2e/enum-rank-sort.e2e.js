// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A record list sorted by the rank of an enum value, in a browser
// (screens-enum-rank-sort). The stub answers like the list endpoint: it
// filters on `priority`, orders by the `_order[...]` field (alphabetically
// for a text field) and cuts at `_limit`.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const tickets = [
	{ id: '1', title: 'A laag', priority: 'low' },
	{ id: '2', title: 'B urgent', priority: 'urgent' },
	{ id: '3', title: 'C hoog', priority: 'high' },
	{ id: '4', title: 'D urgent', priority: 'urgent' },
	{ id: '5', title: 'E zonder', priority: null },
	{ id: '6', title: 'F normaal', priority: 'normal' },
]

test('priority first: the rows follow the rank, not the alphabet', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/pipelinq/ticket**', (route) => {
		const query = new URL(route.request().url()).searchParams
		let rows = tickets.filter((row) => !query.has('priority') || row.priority === query.get('priority'))
		const order = [...query.keys()].find((key) => key.startsWith('_order['))
		if (order) {
			const field = order.slice(7, -1)
			const sign = query.get(order) === 'desc' ? -1 : 1
			rows = [...rows].sort((a, b) => sign * String(a[field] ?? '').localeCompare(String(b[field] ?? '')))
		}
		const limit = Number(query.get('_limit') || 20)
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: rows.slice(0, limit), total: rows.length }),
		})
	})
	await page.goto('/?l6=enum-rank-sort', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const titles = page.locator('.cn-record-list__title')
	await titles.first().waitFor({ state: 'visible', timeout: 60_000 })
	await expect(titles).toHaveText(['B urgent', 'D urgent', 'C hoog', 'F normaal', 'A laag', 'E zonder'])
})
