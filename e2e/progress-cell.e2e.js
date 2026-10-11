// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The progress cell, measured in a browser (abstract-progress-cell): the bar's
// size, the fill's width, the gap to the number, and the tones apart.
// jsdom computes no layout, so these are browser claims.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a progress cell draws a 56 x 8 bar filled to its percentage, the number 8px beside it', async ({ page }) => {
	await page.goto('/?progresscell=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const good = page.locator('[data-testid="progress-row-good"]')
	await good.locator('.cn-cell-renderer__progress').waitFor({ state: 'visible', timeout: 60_000 })

	const bar = await good.locator('.cn-cell-renderer__progress-bar').boundingBox()
	const fill = await good.locator('.cn-cell-renderer__progress-fill').boundingBox()
	const value = await good.locator('.cn-cell-renderer__progress-value').boundingBox()
	expect(Math.round(bar.width)).toBe(56)
	expect(Math.round(bar.height)).toBe(8)
	expect(Math.round(fill.width)).toBe(Math.round(56 * 0.7))
	expect(Math.round(value.x - (bar.x + bar.width))).toBe(8)
	await expect(good.locator('.cn-cell-renderer__progress-value')).toHaveText('70%')
	await expect(good.locator('.cn-cell-renderer__progress-badge')).toHaveCount(0)

	const stale = page.locator('[data-testid="progress-row-stale"]')
	await expect(stale.locator('.cn-cell-renderer__progress-badge')).toHaveText('Verouderd 24 dagen')
	const colors = await page.evaluate(() => {
		const read = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor
		return {
			good: read('[data-testid="progress-row-good"] .cn-cell-renderer__progress-fill'),
			bad: read('[data-testid="progress-row-stale"] .cn-cell-renderer__progress-fill'),
		}
	})
	expect(colors.good).not.toBe(colors.bad)
})
