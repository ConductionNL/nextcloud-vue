// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The reports page under the board look (?l7=reports-board-look, harness
// l7/ReportsBoardLook.vue) measured against board DcRapportages: a 28px title,
// one 18px-headed section per category and no category select, two-up cards
// with a 44px icon tile, a 17px title and a 14px description.
//
// WHY PLAYWRIGHT: the claim is the computed layout of the real stylesheet.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the reports page draws board DcRapportages under the board look', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/?l7=reports-board-look', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="reports-board-look"]')
	await host.locator('[data-testid="cn-report-card"]').first().waitFor({ state: 'visible', timeout: 60_000 })

	if (process.env.L9_SHOT) {
		await host.screenshot({ path: process.env.L9_SHOT })
	}
	await expect(host.locator('[data-testid="cn-reports-category"]')).toHaveCount(0)
	await expect(host.locator('.cn-reports-page__section-title')).toHaveText(['Besluiten en stemmingen', 'Vergaderingen en mensen'])

	const style = (selector, props) => host.locator(selector).first().evaluate((el, names) => {
		const cs = getComputedStyle(el)
		return Object.fromEntries(names.map((n) => [n, cs[n]]))
	}, props)
	expect(await style('.cn-reports-page__title', ['fontSize', 'fontWeight'])).toEqual({ fontSize: '28px', fontWeight: '700' })
	expect(await style('.cn-reports-page__section-title', ['fontSize', 'fontWeight'])).toEqual({ fontSize: '18px', fontWeight: '700' })
	expect(await style('.cn-reports-page__card', ['paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'flexDirection'])).toEqual({ paddingTop: '18px', paddingLeft: '20px', borderTopLeftRadius: '12px', flexDirection: 'row' })
	expect(await style('.cn-reports-page__card-icon', ['width', 'height', 'borderTopLeftRadius'])).toEqual({ width: '44px', height: '44px', borderTopLeftRadius: '10px' })
	expect(await style('.cn-reports-page__card-title', ['fontSize', 'fontWeight'])).toEqual({ fontSize: '17px', fontWeight: '700' })
	expect(await style('.cn-reports-page__card-description', ['fontSize'])).toEqual({ fontSize: '14px' })

	// Two cards side by side in the first section.
	const boxes = await host.locator('[data-testid="cn-reports-section"]').nth(0).locator('[data-testid="cn-report-card"]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
	expect(boxes).toHaveLength(2)
	expect(Math.abs(boxes[0] - boxes[1])).toBeLessThan(1)

})
