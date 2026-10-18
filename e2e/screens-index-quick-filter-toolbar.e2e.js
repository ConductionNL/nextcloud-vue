// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// DqTeamwachtrij draws its quick-filter chips, the Filter button and the view
// switch on ONE row, the search on the row under it, the side panel beside the
// list. With `quickFilterPlacement: "toolbar"` the chips stay on that row in
// the column the side panel leaves: chips that do not fit move into the
// overflow chip instead of pushing Filter and the view switch onto a row of
// their own. ScreensIndexHarness.vue (?screensindex=table&wq=1), the default
// placement as the control.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

/**
 * Open the work-queue scenario and read where the toolbar's parts sit.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<object>} The tops and the chips shown.
 */
async function measure(page, query) {
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 120_000 })
	const box = page.locator('[data-testid="screensindex-box"]')
	await expect(box.locator('.cn-quick-filter-bar__tabs > .cn-quick-filter-bar__tab').first()).toBeVisible({ timeout: 120_000 })
	await page.waitForTimeout(500)
	return box.evaluate((root) => {
		const top = (selector) => {
			const el = root.querySelector(selector)
			return el ? Math.round(el.getBoundingClientRect().top) : null
		}
		return {
			chips: top('.cn-quick-filter-bar__tabs > .cn-quick-filter-bar__tab'),
			controls: top('.cn-actions-bar__view-controls'),
			search: top('.cn-actions-bar__row--search'),
			shown: root.querySelectorAll('.cn-quick-filter-bar__tabs > .cn-quick-filter-bar__tab').length,
			more: !!root.querySelector('[data-testid="cn-quick-filter-more"]'),
		}
	})
}

test.describe('index page: quick filters on the toolbar row', () => {
	test('with a side panel, the chips, Filter and the view switch share one row, the search under it', async ({ page }) => {
		const m = await measure(page, '?screensindex=table&wq=1&w=1176&qfp=toolbar')
		expect(Math.abs(m.chips - m.controls)).toBeLessThanOrEqual(4)
		expect(m.search).toBeGreaterThan(m.controls)
	})

	test('chips that do not fit go into the overflow chip, the row stays one row', async ({ page }) => {
		const m = await measure(page, '?screensindex=table&wq=1&w=760&qfp=toolbar')
		expect(Math.abs(m.chips - m.controls)).toBeLessThanOrEqual(4)
		expect(m.more).toBe(true)
		expect(m.shown).toBeLessThan(5)
	})

	test('control: the default placement keeps every chip', async ({ page }) => {
		const m = await measure(page, '?screensindex=table&wq=1&w=760')
		expect(m.shown).toBe(5)
		expect(m.more).toBe(false)
	})
})
