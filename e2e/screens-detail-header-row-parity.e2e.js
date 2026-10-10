// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-detail-header-row-parity: row 2 of the board look's detail header is
// ONE line, pills, breadcrumb, dot and meta side by side, as the DqZaak and
// PtAccount boards draw it. Live the breadcrumb (NcBreadcrumbs) took the whole
// row at 50px high, so the pills sat above it and the meta under it. That is
// layout, so it is measured here on the real CnDetailPage
// (ScreensDetailHarness.vue, ?screensdetail=tabs&header=1).
//
// @spec openspec/changes/screens-detail-header-row-parity/specs/detail-header-row/spec.md#requirement-row-2-of-the-detail-header-is-one-line

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

/**
 * @param {import('@playwright/test').Locator} locator The element.
 * @return {Promise<{top: number, left: number, right: number, bottom: number, height: number, mid: number}>} Its box.
 */
function rect(locator) {
	return locator.evaluate((el) => {
		const r = el.getBoundingClientRect()
		return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, height: r.height, mid: r.top + r.height / 2 }
	})
}

test.describe('row 2 of the detail header (board look)', () => {
	test('pills, breadcrumb, dot and meta share one line, in that order', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 1100 })
		await page.goto('/?screensdetail=tabs&header=1', { waitUntil: 'domcontentloaded', timeout: 120_000 })
		const row = page.locator('[data-testid="cn-detail-page-header-row2"]')
		await expect(row).toBeVisible({ timeout: 120_000 })
		await expect(row.locator('[data-testid="cn-detail-page-header-meta"]')).toHaveText('via Mijn Zuiddrecht')

		const pills = await rect(row.locator('[data-testid="cn-detail-page-pills"]'))
		const crumbs = await rect(row.locator('[data-testid="cn-detail-page-breadcrumbs"]'))
		const dot = await rect(row.locator('[data-testid="cn-detail-page-header-dot"]'))
		const meta = await rect(row.locator('[data-testid="cn-detail-page-header-meta"]'))

		// One line: every part centred on the same y, within 3px.
		for (const part of [crumbs, dot, meta]) {
			expect(Math.abs(part.mid - pills.mid)).toBeLessThanOrEqual(3)
		}
		// Left to right, 8px apart (the row gap).
		expect(crumbs.left).toBeGreaterThan(pills.right)
		expect(dot.left).toBeGreaterThan(crumbs.right - 1)
		expect(meta.left).toBeGreaterThan(dot.right - 1)
		// The dot follows the record's crumb at the row gap, not after a
		// reserved 100px (NcBreadcrumbs' collapsed last crumb).
		const lastCrumb = await rect(row.locator('[data-testid="cn-breadcrumbs-crumb-1"]'))
		expect(Math.round(dot.left - lastCrumb.right)).toBeLessThanOrEqual(10)
		// A line of text, not a 44px bar of buttons.
		expect(crumbs.height).toBeLessThanOrEqual(24)
		// Both crumbs stay readable: the list and the case number.
		await expect(row.locator('[data-testid="cn-breadcrumbs-crumb-0"]')).toBeVisible()
		await expect(row.locator('[data-testid="cn-breadcrumbs-crumb-1"]')).toContainText('2026-0082')
	})
})
