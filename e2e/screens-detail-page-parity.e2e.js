// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-detail-page-parity (task 4): the tab strip and its panel live in the
// body column, and the side column starts level with the strip. That is LAYOUT,
// which jsdom cannot judge, so it is measured here on the real CnDetailPage
// (ScreensDetailHarness.vue, ?screensdetail=tabs), with a control without the
// board look (`&plain=1`).
//
// @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-tabs-and-their-panel-take-the-body-column

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 120_000 })
	await expect(page.locator('[data-testid="screensdetail-box"] [data-testid="cn-detail-page-side"]')).toBeVisible({ timeout: 120_000 })
	await expect(page.locator('[data-testid="screensdetail-box"] .cn-tabs__nav').first()).toBeVisible({ timeout: 60_000 })
}

/**
 * @param {import('@playwright/test').Locator} locator The element.
 * @return {Promise<{top: number, left: number, width: number, height: number, right: number, bottom: number}>} Its box.
 */
function rect(locator) {
	return locator.evaluate((el) => {
		const r = el.getBoundingClientRect()
		return { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
	})
}

async function boxes(page) {
	return {
		body: await rect(page.locator('.cn-detail-page__body').first()),
		side: await rect(page.locator('[data-testid="cn-detail-page-side"]').first()),
		firstSide: await rect(page.locator('.cn-detail-page__side-item').first()),
		strip: await rect(page.locator('.cn-tabs__bar').first()),
		panel: await rect(page.locator('.cn-tabs__content').first()),
	}
}

test.describe('the tabs and their panel take the body column (detail task 4)', () => {
	test('at 1440px the first side card is level with the strip, and the strip ends where the body column ends', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 1100 })
		await open(page, '?screensdetail=tabs')
		await expect(page.locator('.cn-detail-page.cn-look-board.cn-detail-page--with-side')).toHaveCount(1)
		await expect(page.locator('.cn-tabs--board')).toHaveCount(1)
		const b = await boxes(page)

		// Side by side: the side column right of the body, 20px apart.
		expect(b.side.left).toBeGreaterThan(b.body.right - 1)
		expect(Math.round(b.side.left - b.body.right)).toBe(20)
		expect(Math.round(b.side.width)).toBeGreaterThanOrEqual(300)

		// Level: the top of the first side card is the top of the strip.
		expect(Math.abs(b.firstSide.top - b.strip.top)).toBeLessThanOrEqual(1)

		// The strip and its panel live in the body column and end where it ends.
		expect(b.strip.left).toBeGreaterThanOrEqual(b.body.left - 1)
		expect(Math.abs(b.strip.right - b.body.right)).toBeLessThanOrEqual(1)
		expect(Math.abs(b.panel.right - b.body.right)).toBeLessThanOrEqual(1)
		expect(b.panel.top).toBeGreaterThanOrEqual(b.strip.bottom - 1)
	})

	test('the side column drops under the body when there is no room for both', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 1100 })
		// 760px of page leaves 704px of content: less than 520 + 20 + 300.
		await open(page, '?screensdetail=tabs&w=760')
		const b = await boxes(page)
		expect(b.side.top).toBeGreaterThanOrEqual(b.body.bottom - 1)
		expect(Math.abs(b.side.left - b.body.left)).toBeLessThanOrEqual(1)
		expect(Math.abs(b.side.width - b.body.width)).toBeLessThanOrEqual(1)
	})

	test('without the look the page is not in the board frame (control)', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 1100 })
		await open(page, '?screensdetail=tabs&plain=1')
		await expect(page.locator('.cn-detail-page.cn-look-board')).toHaveCount(0)
		await expect(page.locator('.cn-tabs--board')).toHaveCount(0)
	})
})
