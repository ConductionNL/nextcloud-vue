// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The tab strip stays on ONE line.
//
// Reported on a dossiq case page. Its panels strip was cut from fourteen tabs
// to six specifically to get it onto one line at 1024, and the six still
// wrapped — the first five sat at byte-identical positions before and after
// the cut, so the count was never the variable. The measurement that settles
// what was: `white-space: nowrap` makes a tab's min-content width its whole
// label, so a flex item that is nominally shrinkable cannot shrink, and the
// strip had no way to answer a shortfall except with another row. At 317px it
// took three of them.
//
// WHY PLAYWRIGHT AND NOT JEST
// ---------------------------
// Every assertion here is geometry. jsdom computes no layout, so
// `getBoundingClientRect()` returns zeroes and a unit test would pass with the
// strip wrapped into a block — which is exactly how this shipped.
//
// The boxes are sized in the harness, not here: 440px is what an 8-of-12
// detail-grid cell comes to inside a Nextcloud page at a 1024 viewport,
// measured against a running instance (a 12-column dossiq grid reported 222px
// for a 4-wide cell and 334px for a 6-wide one, so 8 wide is 445px). 700px is
// a cell where the same six tabs are only modestly over, which is where
// "responds to available space" is separable from "scrolls".

import { test, expect } from '@playwright/test'

const URL = '/?tabsfit=1'

// Same cold-compile cost as tabs-widget-chrome.e2e.js: CnTabsWidget pulls the
// whole widget-dispatch chain through CnDetailWidgetHost.
test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * Open the harness, tolerating the cold-compile cost of the first navigation.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the first strip is mounted.
 */
async function openHarness(page) {
	await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="tf-six"] .cn-tabs__nav-item').first().waitFor({ state: 'visible', timeout: 60_000 })
}

/**
 * Geometry of one harness strip.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} testid The harness box's data-testid.
 * @return {Promise<object>} Measured strip geometry.
 */
function measure(page, testid) {
	return page.evaluate((id) => {
		const box = document.querySelector(`[data-testid="${id}"]`)
		const nav = box.querySelector('.cn-tabs__nav')
		const items = [...box.querySelectorAll('.cn-tabs__nav-item')]
		return {
			tabs: items.length,
			// One entry per distinct row the tabs are laid out on.
			rows: [...new Set(items.map((n) => Math.round(n.getBoundingClientRect().top)))].length,
			navHeight: Math.round(nav.getBoundingClientRect().height),
			tabHeight: Math.round(items[0].getBoundingClientRect().height),
			clientWidth: nav.clientWidth,
			scrollWidth: nav.scrollWidth,
		}
	}, testid)
}

test.describe('CnTabs strip fit', () => {
	// PRECONDITION. Every assertion below counts rows, and a strip with no
	// tabs has one row of nothing — which would read as a pass. The chrome
	// spec beside this file was written after exactly that happened.
	test('the harness really renders six tabs in a 440px cell (precondition)', async ({ page }) => {
		await openHarness(page)
		const six = await measure(page, 'tf-six')
		expect(six.tabs).toBe(6)
		expect(six.clientWidth).toBeGreaterThan(200)
	})

	// THE DEFECT. Pre-fix: rows = 3.
	test('six short tabs share ONE line in a 440px cell', async ({ page }) => {
		await openHarness(page)
		const six = await measure(page, 'tf-six')
		expect(six.rows).toBe(1)
	})

	// A row count of 1 is satisfied by a strip one tab tall, and by nothing
	// else — but say it in pixels too, because that is what "wrapped into a
	// block" cost the card.
	test('the strip is one tab tall, not a block', async ({ page }) => {
		await openHarness(page)
		const six = await measure(page, 'tf-six')
		expect(six.navHeight).toBeLessThan(six.tabHeight * 2)
	})

	// A genuinely long strip degrades by scrolling, not by growing downwards.
	test('fourteen tabs stay on one line and scroll', async ({ page }) => {
		await openHarness(page)
		const many = await measure(page, 'tf-fourteen')
		expect(many.tabs).toBe(14)
		expect(many.rows).toBe(1)
		expect(many.scrollWidth).toBeGreaterThan(many.clientWidth)
	})

	// RESPONDS TO AVAILABLE SPACE, which is separable from "scrolls". The same
	// six tabs are only modestly over in a 700px cell: they must shrink to fit
	// rather than scroll, so this fails both for a strip that wraps and for one
	// that keeps every tab at its natural width and scrolls unconditionally.
	test('the same six tabs fit a wider cell without scrolling at all', async ({ page }) => {
		await openHarness(page)
		const wide = await measure(page, 'tf-wide')
		expect(wide.rows).toBe(1)
		expect(wide.scrollWidth).toBeLessThanOrEqual(wide.clientWidth + 1)
	})

	// The long label is the one that gives way. Shrink is proportional to
	// natural width, and this is the visible consequence: a one-word tab keeps
	// its text while the long one truncates.
	test('the long label gives way before the short ones', async ({ page }) => {
		await openHarness(page)
		const widths = await page.evaluate(() => {
			const items = [...document.querySelectorAll('[data-testid="tf-wide"] .cn-tabs__nav-item')]
			return items.map((n) => Math.round(n.getBoundingClientRect().width))
		})
		// "Objects and locations" is last and is still the widest of the six.
		expect(widths[widths.length - 1]).toBeGreaterThan(Math.max(...widths.slice(0, -1)))
	})

	// THE OBJECTION THAT MADE WRAPPING LOOK SAFER. A scrolling strip hides
	// tabs behind an edge with nothing to say they are there; the buttons are
	// what says it. They must not appear on a strip that fits — an affordance
	// that is always present says nothing.
	test('scroll affordances appear on an overflowing strip and nowhere else', async ({ page }) => {
		await openHarness(page)
		await expect(page.locator('[data-testid="tf-fourteen"] .cn-tabs__scroll')).toHaveCount(2)
		await expect(page.locator('[data-testid="tf-wide"] .cn-tabs__scroll')).toHaveCount(0)
	})

	// BOTH render together, the idle one disabled rather than absent. They sit
	// in the bar's flex row, so one appearing mid-scroll would narrow the strip
	// under the scroll that is running — measured, that left the last tab 22px
	// (the button's width) short of the edge and stopped there.
	test('the strip keeps its width while it scrolls', async ({ page }) => {
		await openHarness(page)
		const width = () => page.evaluate(() => document.querySelector('[data-testid="tf-fourteen"] .cn-tabs__nav').clientWidth)
		const before = await width()

		await expect(page.locator('[data-testid="tf-fourteen"] .cn-tabs__scroll--start')).toBeDisabled()
		await page.locator('[data-testid="tf-fourteen"] .cn-tabs__scroll--end').click()
		await expect
			.poll(() => page.evaluate(() => document.querySelector('[data-testid="tf-fourteen"] .cn-tabs__nav').scrollLeft))
			.toBeGreaterThan(0)

		expect(await width()).toBe(before)
		await expect(page.locator('[data-testid="tf-fourteen"] .cn-tabs__scroll--start')).toBeEnabled()
	})

	// The keyboard reaches a tab the pointer would have to scroll to. This is
	// why the scroll buttons are aria-hidden and out of the tab order: they
	// would otherwise add stops to a strip whose job is to be countable.
	test('End brings the last tab into view without a pointer', async ({ page }) => {
		await openHarness(page)
		const nav = page.locator('[data-testid="tf-fourteen"] .cn-tabs__nav')
		await nav.locator('.cn-tabs__nav-item').first().focus()
		await page.keyboard.press('End')

		// Polled, not read once: the strip scrolls smoothly, so a single
		// snapshot lands mid-flight and would fail on a working strip.
		await expect.poll(() => page.evaluate(() => {
			const strip = document.querySelector('[data-testid="tf-fourteen"] .cn-tabs__nav')
			const items = [...strip.querySelectorAll('.cn-tabs__nav-item')]
			const last = items[items.length - 1].getBoundingClientRect()
			const view = strip.getBoundingClientRect()
			return last.left >= view.left - 1 && last.right <= view.right + 1
		})).toBe(true)
	})

	// REGRESSION GUARD ON THE FIX ITSELF. tabs-widget-chrome.e2e.js holds the
	// join between the open tab and its panel, but only on a two-tab strip
	// that FITS. Everything this file changes is about the overflowing case,
	// and the join has to survive it.
	//
	// HONEST LIMIT. The obvious way to break it — letting a classic scrollbar
	// back in, which is part of the box and would push the bar's rule down —
	// was tried, and this test stayed green: Chromium here renders overlay
	// scrollbars, which take no layout space. So this holds the join against
	// the padding/margin trick that keeps the tab's -1px overhang from being
	// clipped, and not against a scrollbar.
	test('the open tab still meets its panel on an OVERFLOWING strip', async ({ page }) => {
		await openHarness(page)
		const gap = await page.evaluate(() => {
			const box = document.querySelector('[data-testid="tf-fourteen"]')
			const active = box.querySelector('.cn-tabs__nav-item--active').getBoundingClientRect()
			const panel = box.querySelector('.cn-tabs__content').getBoundingClientRect()
			return Math.round(panel.top - active.bottom)
		})
		expect(gap).toBeLessThanOrEqual(1)
	})
})
