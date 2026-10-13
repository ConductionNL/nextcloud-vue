// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The date tile cell (screens-date-tile-cell): day number over the short
// month in a 46px tile, beside the weekday and the time range.
//
// WHY PLAYWRIGHT: the tile's box and the two lines beside it are layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the Datum en tijd cell is a 46px tile with the weekday and the time range beside it', async ({ page }) => {
	await page.route('**/apps/openregister/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) }))
	await page.route(/\/apps\/openregister\/api\/objects\/decidiq\/meeting(\?|$)/, (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: '1', title: 'College van B en W', scheduledDate: '2026-10-06T09:30:00', endDate: '2026-10-06T12:00:00' }], total: 1, page: 1, pages: 1 }),
	}))
	await page.goto('/?l8=date-tile', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="date-tile"]')
	await expect(host.getByText('College van B en W')).toBeVisible({ timeout: 60_000 })

	const cell = host.locator('[data-testid="cn-cell-date-block"]')
	await expect(cell.locator('.cn-cell-renderer__date-day')).toHaveText('6')
	await expect(cell.locator('.cn-cell-renderer__date-month')).toHaveText('Oct')
	await expect(cell.locator('.cn-cell-renderer__date-weekday')).toHaveText('Tuesday')
	await expect(cell.locator('.cn-cell-renderer__date-time')).toHaveText('09:30 to 12:00')

	const tile = await cell.locator('.cn-cell-renderer__date-tile').boundingBox()
	const lines = await cell.locator('.cn-cell-renderer__date-lines').boundingBox()
	expect(Math.round(tile.width)).toBe(46)
	// The lines sit 12px to the right of the tile, not under it.
	expect(Math.round(lines.x - (tile.x + tile.width))).toBe(12)
})
