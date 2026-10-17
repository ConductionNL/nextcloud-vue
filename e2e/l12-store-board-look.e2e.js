// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The store page under the board look (?l7=store-board-look, harness
// l7/StoreBoardLook.vue) measured against board PqStore: chips with counts and
// the search on one row, three cards a row with a state pill and one action,
// a side column of at most 300px beside them, and a footnote. The harness
// answers the store endpoint itself with the board's nine items.
//
// WHY PLAYWRIGHT: the claim is the computed layout of the real stylesheet.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the store page draws board PqStore under the board look', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1400 })
	await page.goto('/?l7=store-board-look', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="store-board-look"]')
	await host.locator('[data-testid="store-results"]').waitFor({ state: 'visible', timeout: 60_000 })

	if (process.env.L12_SHOT) {
		await host.screenshot({ path: process.env.L12_SHOT })
	}
	const chips = await host.locator('[data-testid="store-chips"] button').allInnerTexts()
	expect(chips.map((text) => text.replace(/\s+/g, ' ').trim())).toEqual(['All 9', 'Installed 5', 'Updates available 2', 'Connectors 3'])

	const style = (selector, props) => host.locator(selector).first().evaluate((el, names) => {
		const cs = getComputedStyle(el)
		return Object.fromEntries(names.map((n) => [n, cs[n]]))
	}, props)
	expect(await style('.cn-store-page__title', ['fontSize', 'fontWeight'])).toEqual({ fontSize: '28px', fontWeight: '700' })
	expect(await style('.cn-store-page__chip', ['height', 'borderTopLeftRadius'])).toEqual({ height: '36px', borderTopLeftRadius: '18px' })
	expect(await style('.cn-store-page__search-input', ['height'])).toEqual({ height: '40px' })
	expect(await style('.cn-store-page__card', ['paddingTop', 'borderTopLeftRadius'])).toEqual({ paddingTop: '18px', borderTopLeftRadius: '12px' })
	expect(await style('.cn-store-page__card-action--install', ['height', 'borderTopLeftRadius'])).toEqual({ height: '34px', borderTopLeftRadius: '17px' })

	// The search sits right of the chips, on the same row.
	const chipsBox = await host.locator('[data-testid="store-chips"]').boundingBox()
	const searchBox = await host.locator('.cn-store-page__search').boundingBox()
	expect(searchBox.x).toBeGreaterThan(chipsBox.x)
	expect(Math.abs(searchBox.y + searchBox.height / 2 - (chipsBox.y + chipsBox.height / 2))).toBeLessThan(4)

	// Three cards a row.
	const tops = await host.locator('[data-testid="store-results"] > li').evaluateAll((els) => els.slice(0, 3).map((el) => el.getBoundingClientRect().top))
	expect(Math.abs(tops[0] - tops[2])).toBeLessThan(1)

	const aside = await host.locator('[data-testid="store-aside"]').boundingBox()
	const main = await host.locator('.cn-store-page__main').boundingBox()
	expect(aside.width).toBeLessThanOrEqual(300)
	expect(aside.x).toBeGreaterThan(main.x + main.width)
	await expect(host.locator('[data-testid="store-aside-installed"] li')).toHaveCount(5)
	await expect(host.locator('[data-testid="store-updates-summary"]')).toHaveText('2 updates are ready. Een update bewaart je eigen wijzigingen aan fases en wachtrijen.')
	await expect(host.locator('[data-testid="store-footnote"]')).toBeVisible()

	await host.locator('[data-testid="store-chip-kind:adapter"]').click()
	await expect(host.locator('[data-testid="store-results"] > li')).toHaveCount(3)
})
