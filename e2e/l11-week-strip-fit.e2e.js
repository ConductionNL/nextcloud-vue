// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Under the board look a week strip wraps its days inside its card instead of
// scrolling sideways (?l7=week-strip-fit, harness l7/WeekStripFit.vue).
// dossiq's "Termijnen deze week" at 1100 wide held 680px of days in a 494px
// card and scrolled; now it draws three days and two. At a width that held
// the five days before, they are as wide as before. Without the board look the
// strip is unchanged.
//
// WHY PLAYWRIGHT: the claim is the rendered grid and its scroll width.

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

/**
 * Measure a strip: its scroll box and its days.
 *
 * @param {import('@playwright/test').Locator} box The strip's host.
 * @return {Promise<object>} The measures.
 */
function measure(box) {
	return box.evaluate((host) => {
		const scroll = host.querySelector('.cn-week-strip__scroll')
		const days = [...host.querySelectorAll('.cn-week-strip__day')].map((d) => d.getBoundingClientRect())
		const r = scroll.getBoundingClientRect()
		return {
			scrolls: scroll.scrollWidth > scroll.clientWidth + 1,
			inside: days.every((d) => d.left >= r.left - 0.5 && d.right <= r.right + 0.5),
			rows: new Set(days.map((d) => Math.round(d.top))).size,
			widths: days.map((d) => Math.round(d.width)),
		}
	})
}

test('a board week strip wraps its days in a narrow card and keeps its columns in a wide one', async ({ page }) => {
	await page.goto('/?l7=week-strip-fit', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="strip-board-494"] .cn-week-strip__day').first().waitFor({ state: 'visible', timeout: 60_000 })
	if (process.env.L11_SHOT) {
		await page.locator('[data-testid="week-strip-fit"]').screenshot({ path: process.env.L11_SHOT })
	}

	const narrow = await measure(page.locator('[data-testid="strip-board-494"]'))
	expect(narrow.scrolls).toBe(false)
	expect(narrow.inside).toBe(true)
	expect(narrow.rows).toBe(2)
	expect(Math.min(...narrow.widths)).toBeGreaterThanOrEqual(120)

	// 700px: five columns of (700 - 4 gaps of 10px) / 5, as before.
	const wide = await measure(page.locator('[data-testid="strip-board-700"]'))
	expect(wide.widths).toEqual([132, 132, 132, 132, 132])

	// Control: without the board look the strip still scrolls at 494px.
	const plain = await measure(page.locator('[data-testid="strip-plain-494"]'))
	expect(plain.scrolls).toBe(true)
})
