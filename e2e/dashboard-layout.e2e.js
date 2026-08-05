// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec CnDataTable's "View all" footer stays pinned while rows scroll under it.
//
// WHY THIS EXISTS IN e2e AND NOT IN THE JEST SUITE.
//
// The footer already carried `position: sticky; bottom: 0` while being
// completely unable to stick. `.cn-table-container` declared `overflow-x: auto`,
// and CSS forbids mixing `visible` with a non-visible overflow value — so
// `overflow-y` was COERCED from `visible` to `auto`, silently making the
// container the nearest scrollport. Sticky resolves against the nearest
// scrollport only, and that one never scrolled, while the real scrolling
// happened one level up in the widget card.
//
// Every fact in that sentence is a computed-layout fact. jsdom computes no
// layout: it will happily report `position: sticky` on an element that is
// scrolled far out of view. The jest suite can assert the DOM structure that
// makes the fix possible — and it does — but only a real browser can say
// whether the footer is actually where a user would see it.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/?dash=1')
	await expect(page.locator('[data-testid="dash-card"]')).toBeVisible({ timeout: 10_000 })
})

test('the "View all" footer stays inside the visible card while the rows scroll', async ({ page }) => {
	const card = page.locator('[data-testid="dash-card"]')
	const footer = page.locator('.cn-data-table__footer')

	await expect(footer).toBeVisible()

	// Precondition: the card must genuinely overflow, or this test proves
	// nothing — a footer trivially "stays visible" in a card nothing scrolls.
	const overflows = await card.evaluate((el) => el.scrollHeight > el.clientHeight + 1)
	expect(overflows, 'the harness card must overflow for this test to mean anything').toBe(true)

	const within = async () => {
		return await page.evaluate(() => {
			const c = document.querySelector('[data-testid="dash-card"]').getBoundingClientRect()
			const f = document.querySelector('.cn-data-table__footer').getBoundingClientRect()
			// Fully inside the card's visible box, with a pixel of tolerance.
			return f.bottom <= c.bottom + 1 && f.top >= c.top - 1
		})
	}

	expect(await within(), 'footer must be visible before scrolling').toBe(true)

	await card.evaluate((el) => { el.scrollTop = el.scrollHeight })
	await page.waitForTimeout(150)

	expect(await within(), 'footer must STILL be inside the card after scrolling to the bottom').toBe(true)
})

test('the table container is not itself a scrollport, so sticky resolves upward', async ({ page }) => {
	// The root cause in one assertion. If `.cn-table-container` ever regains a
	// non-visible overflow, it becomes the nearest scrollport again and the
	// footer silently stops sticking — with no visual difference until a list
	// is long enough to scroll.
	const overflow = await page.locator('.cn-table-container').evaluate((el) => {
		const cs = getComputedStyle(el)
		return { x: cs.overflowX, y: cs.overflowY }
	})
	expect(overflow.y).toBe('visible')

	// …and the horizontal scroll it used to own now lives on the inner wrapper.
	const scroll = await page.locator('.cn-data-table__scroll').evaluate((el) => getComputedStyle(el).overflowX)
	expect(scroll).toBe('auto')
})
