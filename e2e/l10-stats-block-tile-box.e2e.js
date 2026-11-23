// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A stats-block grid with `tiles: "box"` draws each tile on a grey ground of
// its own, padding 14px 16px and radius 10px, 12px apart (board DcRapportages);
// a grid without it keeps its tiles boxless (board PqMijnWerk)
// (?l8=stats-tile-box, harness l8/StatsTileBox.vue).
//
// WHY PLAYWRIGHT: the claim is the computed style of the real stylesheet
// against the KPI card's own rules.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a boxed stats grid draws its tiles on a ground of their own, a plain one does not', async ({ page }) => {
	await page.route('**/apps/openregister/api/**', (route) => {
		const url = route.request().url()
		const body = url.includes('/aggregations/') ? { value: 58 } : { results: [], total: 58 }
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
	})
	await page.setViewportSize({ width: 1440, height: 1100 })
	await page.goto('/?l8=stats-tile-box', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="stats-tile-box"]')
	const grids = host.locator('[data-testid="cn-stats-block-grid"]')
	await expect(grids).toHaveCount(2, { timeout: 60_000 })

	if (process.env.L10_SHOT) {
		await host.screenshot({ path: process.env.L10_SHOT })
	}

	const tileStyle = (grid) => grid.locator('[data-testid="cn-stats-block-grid-stat"]').first().evaluate((el) => {
		const cs = getComputedStyle(el)
		const ground = getComputedStyle(document.body).getPropertyValue('--color-background-hover').trim()
		return { background: cs.backgroundColor, padding: `${cs.paddingTop} ${cs.paddingLeft}`, radius: cs.borderTopLeftRadius, ground }
	})

	const plain = await tileStyle(grids.nth(0))
	expect(plain.background).toBe('rgba(0, 0, 0, 0)')
	expect(plain.padding).toBe('0px 0px')

	const boxed = await tileStyle(grids.nth(1))
	expect(boxed.background).not.toBe('rgba(0, 0, 0, 0)')
	expect(boxed.padding).toBe('14px 16px')
	expect(boxed.radius).toBe('10px')
	expect(await grids.nth(1).evaluate((el) => getComputedStyle(el).columnGap)).toBe('12px')

	// Every tile stays inside its card: the last column does not run past it.
	for (const i of [0, 1]) {
		const card = await grids.nth(i).locator('xpath=ancestor::div[contains(@class, "cn-widget-wrapper ")][1]').boundingBox()
		const last = await grids.nth(i).locator('[data-testid="cn-stats-block-grid-stat"]').last().boundingBox()
		expect(last.x + last.width).toBeLessThanOrEqual(card.x + card.width)
	}
})
