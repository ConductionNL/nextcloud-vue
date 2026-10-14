// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Under the board look the reports page's widget area draws no panel, its
// card lines up with the report cards, and the report cards are not
// underlined (?l8=reports-no-panel, harness l8/ReportsNoPanel.vue, board
// DcRapportages), even inside a theme that paints anything named like a
// widget white and underlines every link.
//
// WHY PLAYWRIGHT: the claim is the cascade of the real stylesheet against a
// theme rule with id specificity.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the reports widget area draws no panel and its card lines up with the report cards', async ({ page }) => {
	await page.route('**/apps/openregister/api/**', (route) => {
		const url = route.request().url()
		const body = url.includes('/aggregations/') ? { value: 13 } : { results: [], total: 13 }
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
	})
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/?l8=reports-no-panel', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="reports-no-panel"]')
	const card = host.locator('.cn-reports-page__widgets .cn-widget-wrapper').first()
	await card.waitFor({ state: 'visible', timeout: 60_000 })

	if (process.env.L10_SHOT) {
		await host.screenshot({ path: process.env.L10_SHOT })
	}

	const area = await host.locator('.cn-reports-page__widgets').evaluate((el) => getComputedStyle(el).backgroundColor)
	expect(area).toBe('rgba(0, 0, 0, 0)')

	const grid = await host.locator('[data-testid="cn-reports-grid"]').boundingBox()
	const box = await card.boundingBox()
	expect(Math.abs(box.x - grid.x)).toBeLessThan(1)
	expect(Math.abs((box.x + box.width) - (grid.x + grid.width))).toBeLessThan(1)

	const deco = await host.locator('.cn-reports-page__card-title').first().evaluate((el) => getComputedStyle(el).textDecorationLine)
	expect(deco).toBe('none')
})
