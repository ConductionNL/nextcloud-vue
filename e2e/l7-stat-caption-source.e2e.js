// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A stat tile's caption with its own count (?l7=stat-caption-source, harness
// l7/StatCaptionSource.vue): the tile counts the open requests, the line under
// the number counts the ones that wait too long, in the error colour; at zero
// it reads the calm text, uncoloured.
//
// WHY PLAYWRIGHT: two real requests through the real registry and dashboard,
// and the caption's colour and place are computed style and layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {number} late What the caption's count answers.
 */
async function stub(page, late) {
	await page.route('**/apps/openregister/api/objects/aggregations/portaliq/portalAccessRequest/value**', (route) => {
		const escalated = decodeURIComponent(route.request().url()).includes('filter[escalated]')
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ value: escalated ? late : 3 }) })
	})
}

test('the caption under the number carries its own count, in the error colour', async ({ page }) => {
	await stub(page, 1)
	await page.goto('/?l7=stat-caption-source', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const tile = page.locator('[data-testid="stat-caption-source"] .cn-stat-widget')
	await tile.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(tile.locator('.cn-stat-widget__value')).toHaveText('3')
	const caption = tile.locator('[data-testid="cn-stat-widget-caption"]')
	await expect(caption).toHaveText('1 wacht al lang')
	await expect(caption).toHaveClass(/cn-kpi-card__label--error/)
	const info = await tile.evaluate((el) => {
		const value = el.querySelector('.cn-stat-widget__value').getBoundingClientRect()
		const line = el.querySelector('[data-testid="cn-stat-widget-caption"]')
		const label = el.querySelector('.cn-kpi-card__label:not(.cn-stat-widget__caption)')
		return { under: line.getBoundingClientRect().top >= value.bottom - 1, colour: getComputedStyle(line).color, muted: label ? getComputedStyle(label).color : '' }
	})
	expect(info.under).toBe(true)
	expect(info.colour).not.toBe(info.muted)
})

test('at zero the caption reads the calm text, uncoloured', async ({ page }) => {
	await stub(page, 0)
	await page.goto('/?l7=stat-caption-source', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const tile = page.locator('[data-testid="stat-caption-source"] .cn-stat-widget')
	await tile.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(tile.locator('.cn-stat-widget__value')).toHaveText('3')
	const caption = tile.locator('[data-testid="cn-stat-widget-caption"]')
	await expect(caption).toHaveText('Niemand wacht lang')
	await expect(caption).not.toHaveClass(/cn-kpi-card__label--error/)
})
