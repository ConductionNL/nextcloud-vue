// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The tabs widget's strip must BE the card's top edge.
//
// Reported on a dossiq case: the strip sat inside the card with the card's own
// 8px/12px padding around it and CnTabs' 12px gap below it, so the open tab
// floated above content it is drawn as being attached to, and the card spent a
// row of height on chrome that says nothing the open tab does not already say.
//
// WHY PLAYWRIGHT AND NOT JEST
// ---------------------------
// Every assertion here is geometry: where the strip sits relative to the card,
// and how many pixels separate the open tab from its panel. jsdom computes no
// layout, so `getBoundingClientRect()` returns zeroes for all of it and a unit
// test would pass with the defect fully present. Only a real browser can fail.
//
// The assertions are on MEASURED distances rather than on the CSS declarations
// that produce them, so any other correct implementation also passes and a
// regression fails. Asserting `padding: 0` would only assert that my own fix is
// still written the way I wrote it.

import { test, expect } from '@playwright/test'

const URL = '/?tabswidget=1'

// CnTabsWidget pulls the whole widget-dispatch chain through CnDetailWidgetHost,
// so vite's first on-demand compile of this entry is slow. Five parallel workers
// each triggered it and all five timed out on a cold server. Serial + a longer
// budget pays that cost once; `domcontentloaded` avoids waiting on subresources
// the assertions never touch.
test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * Open the harness, tolerating the cold-compile cost of the first navigation.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the widget is mounted.
 */
async function openHarness(page) {
	await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="tw-widget"] .cn-tabs-widget').waitFor({ state: 'visible', timeout: 60_000 })
}

test.describe('CnTabsWidget chrome', () => {
	// PRECONDITION. The first version of this spec passed two of its assertions
	// with ZERO tabs rendered, because the harness handed CnTabsWidget the wrong
	// prop names and every geometry check then measured an empty bar. A spec that
	// can pass on an empty component is not testing the component, so this runs
	// first and fails loudly if the strip is empty.
	test('the harness really renders a tab strip (precondition)', async ({ page }) => {
		await openHarness(page)
		await expect(page.locator('.cn-tabs__nav-item')).toHaveCount(2)
		await expect(page.locator('.cn-tabs__nav-item--active')).toHaveCount(1)
	})

	test('the strip sits at the card top edge, not inset by card padding', async ({ page }) => {
		await openHarness(page)
		const card = page.locator('[data-testid="tw-widget"] .cn-tabs-widget')
		await expect(card).toBeVisible()

		const gap = await page.evaluate(() => {
			const c = document.querySelector('.cn-tabs-widget')
			const bar = c.querySelector('.cn-tabs__bar')
			// Distance from the card's inner top edge to the top of the strip.
			// The bar keeps a small inset of its own so the first tab clears the
			// card's rounded corner; what must be gone is the card's padding.
			return Math.round(bar.getBoundingClientRect().top - c.getBoundingClientRect().top)
		})
		// Pre-fix this was the card's 8px padding PLUS the bar's own offset.
		expect(gap).toBeLessThanOrEqual(8)
	})

	test('no title row is rendered above the strip', async ({ page }) => {
		await openHarness(page)
		const above = await page.evaluate(() => {
			const c = document.querySelector('.cn-tabs-widget')
			const barTop = c.querySelector('.cn-tabs__bar').getBoundingClientRect().top
			// Anything with text painted above the strip inside the card is a
			// title row, which the open tab already makes redundant.
			return [...c.querySelectorAll('*')]
				.filter((n) => n.textContent.trim() && n.getBoundingClientRect().bottom <= barTop)
				.map((n) => n.textContent.trim().slice(0, 30))
		})
		expect(above).toEqual([])
	})

	test('the open tab is joined to its panel with no gap', async ({ page }) => {
		await openHarness(page)
		const active = page.locator('.cn-tabs__nav-item--active')
		await expect(active).toBeVisible()

		const gap = await page.evaluate(() => {
			const a = document.querySelector('.cn-tabs__nav-item--active').getBoundingClientRect()
			const panel = document.querySelector('.cn-tabs__content').getBoundingClientRect()
			return Math.round(panel.top - a.bottom)
		})
		// Pre-fix CnTabs' own `padding-top: 12px` opened this gap. Allow 1px for
		// the deliberate -1px overlap that lets the tab cover the bar's rule.
		expect(gap).toBeLessThanOrEqual(1)
	})

	test('the actions surface stays inside the card, on the tab row', async ({ page }) => {
		await openHarness(page)
		const inside = await page.evaluate(() => {
			const c = document.querySelector('.cn-tabs-widget').getBoundingClientRect()
			const end = document.querySelector('.cn-tabs__nav-end')
			if (!end) return 'no nav-end'
			const e = end.getBoundingClientRect()
			return { withinRight: e.right <= c.right + 1, onTabRow: e.top < document.querySelector('.cn-tabs__content').getBoundingClientRect().top }
		})
		if (inside === 'no nav-end') test.skip(true, 'harness widget renders no actions menu')
		expect(inside.withinRight).toBe(true)
		expect(inside.onTabRow).toBe(true)
	})

	test('inactive tabs carry their own darker surface', async ({ page }) => {
		await openHarness(page)
		const bg = await page.evaluate(() => {
			const items = [...document.querySelectorAll('.cn-tabs__nav-item')]
			const inactive = items.find((n) => !n.classList.contains('cn-tabs__nav-item--active'))
			const active = items.find((n) => n.classList.contains('cn-tabs__nav-item--active'))
			const c = (el) => getComputedStyle(el).backgroundColor
			return { inactive: c(inactive), active: c(active) }
		})
		// The point of the change: a real tab strip, where the unopened tabs are
		// a different surface from the open one rather than bare text.
		expect(bg.inactive).not.toBe('rgba(0, 0, 0, 0)')
		expect(bg.inactive).not.toBe(bg.active)
	})
})
