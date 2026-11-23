// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// detail-grid-breakpoint-with-side-column: a detail page's body grid stacks to
// one column at 1000px of GRID width, or at 600px when a side column narrows the
// grid. A KPI row of six tiles (gridWidth 2) stays one row at about 790px of grid
// beside a side column, still stacks without a side column, and stacks under 600px.
// Layout, so it is measured in a real browser (ScreensDetailHarness.vue, ?screensdetail=kpi).

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<number[]>} The distinct top offsets of the six tiles.
 */
async function tileRows(page, query) {
	await page.setViewportSize({ width: 1600, height: 1000 })
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 120_000 })
	const tiles = page.locator('[data-testid="screensdetail-box"] .cn-detail-page__grid .harness-note')
	await expect(tiles).toHaveCount(6, { timeout: 120_000 })
	// Let GridStack settle its column count.
	await page.waitForFunction(() => document.querySelectorAll('.cn-detail-page__grid .grid-stack-item').length === 6)
	await page.waitForTimeout(500)
	const tops = await tiles.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
	return [...new Set(tops)]
}

test.describe('the detail body grid breakpoint follows the available width', () => {
	test('beside a side column, 6 tiles stay one row at about 790px of grid (page 1160px)', async ({ page }) => {
		expect(await tileRows(page, '?screensdetail=kpi&w=1160')).toHaveLength(1)
	})

	test('without a side column the same grid still stacks under 1000px (page 790px)', async ({ page }) => {
		expect((await tileRows(page, '?screensdetail=kpi&noside=1&w=790')).length).toBeGreaterThan(1)
	})

	test('beside a side column the grid stacks once it is under 600px (page 900px)', async ({ page }) => {
		expect((await tileRows(page, '?screensdetail=kpi&w=900')).length).toBeGreaterThan(1)
	})
})
