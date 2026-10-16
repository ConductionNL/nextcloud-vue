// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The reports page under the board look (?l7=reports-board-look, harness
// l7/ReportsBoardLook.vue) measured against board PqReports: a 28px title,
// 36px category chips, uppercase 13px captions, three-up cards with a 40px icon
// tile and a 34px Open button, a side column of at most 300px and a footnote.
//
// WHY PLAYWRIGHT: the claim is the computed layout of the real stylesheet.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the reports page draws board PqReports under the board look', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1600 })
	await page.goto('/?l7=reports-board-look', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="reports-board-look"]')
	await host.locator('[data-testid="cn-report-card"]').first().waitFor({ state: 'visible', timeout: 60_000 })

	if (process.env.L9_SHOT) {
		await host.screenshot({ path: process.env.L9_SHOT })
	}
	await expect(host.locator('[data-testid="cn-reports-category"]')).toHaveCount(0)
	await expect(host.locator('[data-testid="cn-reports-chips"] button')).toHaveCount(6)
	await expect(host.locator('.cn-reports-page__section-title')).toHaveText(['Aantallen en kanalen', 'Mensen en prestaties', 'Omzet en prognose', 'Klantloyaliteit', 'Marketing en campagnes'])

	const style = (selector, props) => host.locator(selector).first().evaluate((el, names) => {
		const cs = getComputedStyle(el)
		return Object.fromEntries(names.map((n) => [n, cs[n]]))
	}, props)
	expect(await style('.cn-reports-page__title', ['fontSize', 'fontWeight'])).toEqual({ fontSize: '28px', fontWeight: '700' })
	expect(await style('.cn-reports-page__chip', ['height', 'borderTopLeftRadius'])).toEqual({ height: '36px', borderTopLeftRadius: '18px' })
	expect(await style('.cn-reports-page__section-title', ['fontSize', 'fontWeight', 'textTransform'])).toEqual({ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' })
	expect(await style('.cn-reports-page__card', ['paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'flexDirection'])).toEqual({ paddingTop: '18px', paddingLeft: '18px', borderTopLeftRadius: '12px', flexDirection: 'column' })
	expect(await style('.cn-reports-page__card-icon', ['width', 'height', 'borderTopLeftRadius'])).toEqual({ width: '40px', height: '40px', borderTopLeftRadius: '10px' })
	expect(await style('.cn-reports-page__card-title', ['fontSize', 'fontWeight'])).toEqual({ fontSize: '17px', fontWeight: '700' })
	expect(await style('.cn-reports-page__card-open', ['height'])).toEqual({ height: '34px' })

	// Three cards side by side in the first section.
	const tops = await host.locator('[data-testid="cn-reports-section"]').nth(0).locator('[data-testid="cn-report-card"]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
	expect(tops).toHaveLength(3)
	expect(Math.abs(tops[0] - tops[2])).toBeLessThan(1)

	// The side column sits beside the sections, at most 300px wide.
	const aside = await host.locator('[data-testid="cn-reports-aside"]').boundingBox()
	const main = await host.locator('.cn-reports-page__main').boundingBox()
	expect(aside.width).toBeLessThanOrEqual(300)
	expect(aside.x).toBeGreaterThan(main.x + main.width)
	await expect(host.locator('[data-testid="cn-reports-footnote"]')).toBeVisible()
})
