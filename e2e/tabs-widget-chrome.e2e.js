// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The panel is the card. The tab strip sits on top of it, with no chrome of
// its own.
//
// Reported on a dossiq case, twice. First the strip sat inside the card with
// the card's own 8px/12px padding around it and CnTabs' 12px gap below it, so
// the open tab floated above content it is drawn as being attached to, and the
// card spent a row of height on chrome that says nothing the open tab does not
// already say. That was fixed by taking the padding out, which left the card's
// border and rounded corners still wrapped around the strip: a second edge
// above folder tabs, reading as a header the widget does not have. So the
// border, the radius and the background moved down onto the panel.
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

import { expect, test } from '@playwright/test'

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
			if (!end) {
				return 'no nav-end'
			}
			const e = end.getBoundingClientRect()
			return { withinRight: e.right <= c.right + 1, onTabRow: e.top < document.querySelector('.cn-tabs__content').getBoundingClientRect().top }
		})
		if (inside === 'no nav-end') {
			test.skip(true, 'harness widget renders no actions menu')
		}
		expect(inside.withinRight).toBe(true)
		expect(inside.onTabRow).toBe(true)
	})

	// REGRESSION, and a gap in this file's own reach.
	//
	// Nextcloud's server stylesheet sets `margin-bottom: 3px` on every plain
	// `button`, with a selector scoring (0,2,1) against the (0,2,0) of the
	// component's scoped rule. Inside a real Nextcloud page the tabs therefore
	// sat 4px ABOVE the bar's rule and the open tab never met its panel: the
	// join was only ever visible in this harness, which is a bare vite page
	// that does not load Nextcloud's CSS.
	//
	// So this test injects that one competing declaration and asserts the
	// component still wins. It is the narrowest honest way to cover a cascade
	// conflict here; the harness cannot host the whole server stylesheet.
	test('the tab overlap survives Nextcloud\'s own button margin', async ({ page }) => {
		await openHarness(page)
		await page.addStyleTag({
			content: 'button:not(.button-vue, [class^="vs__"]):not(.app-navigation-entry-button) { margin-bottom: 3px; }',
		})
		const mb = await page.evaluate(() => getComputedStyle(document.querySelector('.cn-tabs__nav-item--active')).marginBottom)
		expect(mb).toBe('-1px')
	})

	// The strip carries no card chrome of its own. Measured through
	// getComputedStyle rather than by reading the stylesheet, so any other
	// correct implementation passes and only a regression fails.
	test('the card border and radius are on the panel, not around the strip', async ({ page }) => {
		await openHarness(page)
		const chrome = await page.evaluate(() => {
			const px = (v) => Math.round(parseFloat(v) || 0)
			const root = getComputedStyle(document.querySelector('.cn-tabs-widget'))
			const panel = getComputedStyle(document.querySelector('.cn-tabs__content'))
			return {
				rootBorderTop: px(root.borderTopWidth),
				rootBorderLeft: px(root.borderLeftWidth),
				rootRadiusTopLeft: px(root.borderTopLeftRadius),
				panelBorderLeft: px(panel.borderLeftWidth),
				panelBorderBottom: px(panel.borderBottomWidth),
				// The panel's top edge is the bar's own rule, so a border here
				// would draw a second line the open tab cannot paint over.
				panelBorderTop: px(panel.borderTopWidth),
				panelRadiusTopLeft: px(panel.borderTopLeftRadius),
				panelRadiusBottomLeft: px(panel.borderBottomLeftRadius),
			}
		})

		expect(chrome.rootBorderTop).toBe(0)
		expect(chrome.rootBorderLeft).toBe(0)
		expect(chrome.rootRadiusTopLeft).toBe(0)

		expect(chrome.panelBorderLeft).toBeGreaterThan(0)
		expect(chrome.panelBorderBottom).toBeGreaterThan(0)
		expect(chrome.panelBorderTop).toBe(0)
		// Square under the strip, rounded where the sheet ends.
		expect(chrome.panelRadiusTopLeft).toBe(0)
		expect(chrome.panelRadiusBottomLeft).toBeGreaterThan(0)
	})

	// The first tab starts at the panel's left edge, so the strip reads as the
	// sheet's own edge rather than as a row floating inside it.
	//
	// Measured on the TAB, not on the bar. The bar's padding sits inside its
	// border box, so `bar.getBoundingClientRect()` is identical with and
	// without the 8px inset: an assertion on the bar's edges passes with the
	// inset fully present, which is how the first version of this test was
	// written and why it proved nothing.
	test('the first tab starts at the panel edge, with no inset', async ({ page }) => {
		await openHarness(page)
		const offset = await page.evaluate(() => {
			const tab = document.querySelector('.cn-tabs__nav-item').getBoundingClientRect()
			const panel = document.querySelector('.cn-tabs__content').getBoundingClientRect()
			return Math.round(tab.left - panel.left)
		})
		// 1px of slack for the panel's own left border.
		expect(Math.abs(offset)).toBeLessThanOrEqual(1)
	})

	// REGRESSION, and the reason the root rule doubles its class.
	//
	// Nextcloud serves every enabled app's assets on every page, each app
	// bundles this library's compiled CSS, and the Vue scope id comes from the
	// file PATH, so it is byte-identical across library versions. An app on an
	// older release ships a rule with EXACTLY this selector and the old
	// declarations, onto the pages of an app already on the new one. Measured
	// live on a dossiq case: three stale copies, one from hermiq's
	// companion.css and two inline from other bundles. Same specificity, so
	// source order decided and the card border came back around the strip.
	//
	// This injects one such copy, appended last so source order favours it, and
	// asserts the component still wins. The harness cannot host another app's
	// whole bundle; one competing declaration is the narrowest honest model of
	// it, the same way the Nextcloud button-margin test above works.
	test('the panel chrome survives an older app\'s copy of the old rule', async ({ page }) => {
		await openHarness(page)
		const scopeId = await page.evaluate(() => {
			const el = document.querySelector('.cn-tabs-widget')
			const attr = [...el.attributes].find((a) => a.name.startsWith('data-v-'))
			return attr ? attr.name : null
		})
		expect(scopeId).not.toBeNull()

		await page.addStyleTag({
			content: `.cn-tabs-widget[${scopeId}] {
				background-color: var(--color-main-background);
				border: 1px solid var(--color-border);
				border-radius: var(--border-radius-large);
				overflow: hidden;
			}`,
		})

		const chrome = await page.evaluate(() => {
			const px = (v) => Math.round(parseFloat(v) || 0)
			const root = getComputedStyle(document.querySelector('.cn-tabs-widget'))
			return {
				borderTop: px(root.borderTopWidth),
				radiusTopLeft: px(root.borderTopLeftRadius),
			}
		})
		expect(chrome.borderTop).toBe(0)
		expect(chrome.radiusTopLeft).toBe(0)
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
