// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// board-loads-every-row: a self-fetching index page in board view asks for 500
// rows, not the table's 20, says how many it shows of how many match, and
// "Load more" adds page 2 after the rows already on the board (board
// DqWerkbord: every open case, not the first page).
//
// WHY PLAYWRIGHT: the batch size is a real list request and the board counts
// rendered cards.
//
// @spec openspec/changes/board-loads-every-row/specs/board-view/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const TOTAL = 612
const SCHEMA = {
	id: 'case',
	slug: 'case',
	title: 'Zaak',
	properties: {
		title: { type: 'string', title: 'Titel' },
		status: { type: 'string', title: 'Status', enum: ['Ontvangen', 'In behandeling', 'Besluit'] },
	},
}
const STATUSES = SCHEMA.properties.status.enum
const CASES = Array.from({ length: TOTAL }, (_, i) => ({ id: `c${i + 1}`, title: `Zaak ${i + 1}`, status: STATUSES[i % 3] }))

test('the board loads every matching case, in batches of 500', async ({ page }) => {
	const queries = []
	await page.route('**/apps/openregister/api/**', (route) => {
		const request = route.request()
		const url = decodeURIComponent(request.url())
		if (url.includes('/api/schemas/')) {
			return route.fulfill({ contentType: 'application/json', body: JSON.stringify(SCHEMA) })
		}
		if (url.includes('/api/registers/')) {
			return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'dossiq', slug: 'dossiq', schemas: ['case'] }) })
		}
		const params = new URL(request.url()).searchParams
		const limit = Number(params.get('_limit') || 20)
		const current = Number(params.get('_page') || 1)
		queries.push({ limit, page: current })
		const results = CASES.slice((current - 1) * limit, current * limit)
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results, total: TOTAL, page: current, pages: Math.ceil(TOTAL / limit) }) })
	})
	await page.setViewportSize({ width: 1280, height: 1000 })
	await page.goto('/?l8=board-batches', { waitUntil: 'domcontentloaded', timeout: 90_000 })

	const root = page.locator('[data-testid="board-batches"]')
	const count = root.locator('[data-testid="cn-index-board-load-count"]')
	const more = root.locator('[data-testid="cn-index-board-load-more"]')
	await expect(count).toHaveText('Showing 500 of 612', { timeout: 90_000 })
	expect(queries.every((q) => q.limit === 500)).toBe(true)
	await expect(root.locator('[data-testid="cn-board-card"]')).toHaveCount(500)

	await more.click()
	await expect(count).toHaveText('Showing 612 of 612')
	await expect(more).toHaveCount(0)
	await expect(root.locator('[data-testid="cn-board-card"]')).toHaveCount(612)
	expect(queries.at(-1)).toEqual({ limit: 500, page: 2 })
	await expect(root.locator('[data-testid="cn-board-card"]', { hasText: 'Zaak 612' }).first()).toBeAttached()
})
