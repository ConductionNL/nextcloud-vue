// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// CnDataTable's horizontal scrollport must be reachable by keyboard.
//
// A region that scrolls but cannot take focus leaves a keyboard-only user with
// no way to reach the columns past the fold. axe reports it as
// `scrollable-region-focusable` at SERIOUS impact (WCAG 2.1.1). Reported by
// scholiq (#611), where it fails the shared axe gate on every page carrying a
// CnDataTable — and is not fixable from the consuming app, because the element
// is created inside this component and nothing is exposed to set an attribute
// on it.
//
// WHY THIS LIVES IN PLAYWRIGHT AND NOT THE JEST a11y LANE
// -------------------------------------------------------
// axe only applies this rule to elements that are ACTUALLY scrollable, which it
// decides from `scrollWidth` vs `clientWidth`. jsdom computes no layout, so both
// are 0, the rule never fires, and `tests/a11y/CnDataTable.a11y.spec.js` passes
// with the defect fully present. A real browser is the only place this can fail.
//
// The spec runs the REAL axe-core against the real rule rather than asserting
// that a `tabindex` attribute is present. Asserting the attribute would be
// asserting that my own fix is still written the way I wrote it; asserting the
// rule means any other correct fix also passes, and a regression fails.

import { test, expect } from '@playwright/test'

// Playwright transpiles these specs to CJS, so `require` is available and
// `import.meta` is not. Resolving the real installed axe-core keeps the spec
// running the same engine version as the jest a11y lane.
// eslint-disable-next-line no-undef
const AXE_PATH = require.resolve('axe-core')

/**
 * Run axe-core in the page, scoped to one element, for a single rule.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} testId The data-testid of the container to scan.
 * @param {string} ruleId The axe rule to run.
 * @return {Promise<object>} `{ violations, incomplete, passes }` counts + nodes.
 */
async function axeRule(page, testId, ruleId) {
	await page.addScriptTag({ path: AXE_PATH })
	return page.evaluate(async ([id, rule]) => {
		const root = document.querySelector(`[data-testid="${id}"]`)
		// eslint-disable-next-line no-undef
		const res = await axe.run(root, { runOnly: { type: 'rule', values: [rule] } })
		return {
			violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.html) })),
			passes: res.passes.length,
			incomplete: res.incomplete.length,
		}
	}, [testId, ruleId])
}

test.describe('CnDataTable horizontal scrollport', () => {
	test('really does overflow in the harness (precondition)', async ({ page }) => {
		await page.goto('/?dtscroll=1')
		const overflow = await page.locator('[data-testid="dt-overflowing"] .cn-data-table__scroll').evaluate(
			(el) => el.scrollWidth - el.clientWidth,
		)
		// If this ever reaches 0 the two tests below would pass vacuously —
		// axe skips the rule entirely on a region that does not scroll.
		expect(overflow).toBeGreaterThan(1)
	})

	test('passes axe scrollable-region-focusable', async ({ page }) => {
		await page.goto('/?dtscroll=1')
		await expect(page.locator('[data-testid="dt-overflowing"] table')).toBeVisible()

		const result = await axeRule(page, 'dt-overflowing', 'scrollable-region-focusable')
		expect(result.violations).toEqual([])
	})

	// MEASURED CAVEAT, so the next reader does not over-read this test.
	//
	// Chrome 127+ ships "keyboard-focusable scrollers": a scrollable div is
	// focusable AND in the tab order with no `tabindex` at all. Both halves of
	// the reachability assertion below therefore PASS on the pre-fix build —
	// verified, not assumed. Chromium is the only browser this suite runs.
	//
	// So reachability is not what discriminates here; the axe test above is what
	// covers the real gap (other engines and the fleet's a11y gate, neither of
	// which model Chrome's behaviour). What this test adds on its own is the
	// ACCESSIBLE NAME: pre-fix the announced name is "", i.e. even in the
	// browser that hands you the stop for free, you land somewhere unnamed.
	test('the scrollport is reachable in the tab order, and announced', async ({ page }) => {
		await page.goto('/?dtscroll=1')
		const scroll = page.locator('[data-testid="dt-overflowing"] .cn-data-table__scroll')
		await expect(scroll).toBeVisible()

		await page.locator('body').click({ position: { x: 1, y: 1 } })
		let reached = false
		for (let i = 0; i < 12 && !reached; i++) {
			await page.keyboard.press('Tab')
			reached = await page.evaluate(() => {
				const el = document.querySelector('[data-testid="dt-overflowing"] .cn-data-table__scroll')
				return document.activeElement === el
			})
		}
		expect(reached).toBe(true)

		// And it must be announced as something, not as a bare mystery stop.
		await expect(scroll).toHaveAttribute('aria-label', /Courses/)
	})

	// The other half of the contract, and the reason the tab stop is
	// conditional: a table that fits needs no scrolling, so it must NOT put
	// itself on the keyboard path. Without this, "add tabindex=0 everywhere"
	// would pass the spec above while making every table in the fleet a stop.
	test('a table that does not overflow is NOT a tab stop', async ({ page }) => {
		await page.goto('/?dtscroll=1')
		const fitting = page.locator('[data-testid="dt-fitting"] .cn-data-table__scroll')
		await expect(fitting).toBeVisible()

		const overflow = await fitting.evaluate((el) => el.scrollWidth - el.clientWidth)
		expect(overflow).toBeLessThanOrEqual(1)

		await expect(fitting).not.toHaveAttribute('tabindex', /.*/)
		await expect(fitting).not.toHaveAttribute('role', /.*/)
	})
})
