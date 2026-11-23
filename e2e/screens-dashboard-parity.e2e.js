// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-dashboard-parity: the claims that are LAYOUT, which jsdom cannot judge
// (it computes no styles and no widths): the compact segmented control's
// heights, the KPI row reflowing at two widths, the board tile's 28px value and
// link-only glyph, and the 28px h1. Each has a control without the board look
// or without `compact`, so a passing assertion is about the change.
//
// @spec openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-a-compact-segmented-control
// @spec openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-a-kpi-row-above-the-grid
// @spec openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-the-board-kpi-tile
// @spec openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md#requirement-the-board-dashboard-header

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="screens-box"]')).toBeVisible({ timeout: 90_000 })
}

test('a compact segmented control is a 40px track of 34px segments; normal is unchanged', async ({ page }) => {
	await open(page, '?screens=segmented')
	const compact = page.locator('.cn-segmented-control--compact')
	const track = await compact.evaluate((el) => el.getBoundingClientRect().height)
	const segment = await compact.locator('button').first().evaluate((el) => el.getBoundingClientRect().height)
	expect(Math.round(track)).toBe(40)
	expect(Math.round(segment)).toBe(34)
	const padding = await compact.evaluate((el) => getComputedStyle(el).paddingTop)
	expect(padding).toBe('3px')
	const normal = page.locator('.screens-parity__normal button').first()
	expect(Math.round(await normal.evaluate((el) => el.getBoundingClientRect().height))).toBe(36)
	// The pressed segment takes the main background.
	const pressed = compact.locator('button[aria-pressed="true"]')
	await expect(pressed).toHaveText('Quarter')
})

test('the KPI row sits four in a row at 1240px and two per row at 700px, each at least 200px', async ({ page }) => {
	await open(page, '?screens=kpi&w=1240')
	const rects = await page.locator('[data-testid="screens-kpi-tile"]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))
	expect(new Set(rects.map((r) => Math.round(r.top))).size).toBe(1)
	rects.forEach((r) => expect(r.width).toBeGreaterThanOrEqual(200))

	await open(page, '?screens=kpi&w=700')
	const narrow = await page.locator('[data-testid="screens-kpi-tile"]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))
	expect(new Set(narrow.map((r) => Math.round(r.top))).size).toBe(2)
	narrow.forEach((r) => expect(r.width).toBeGreaterThanOrEqual(200))
})

test('the board KPI tile draws its value at 28px and the glyph only on a link tile; without the look it is 34px', async ({ page }) => {
	await open(page, '?screens=tile')
	const value = page.locator('[data-testid="screens-tile"] .cn-kpi-card__value')
	expect(await value.evaluate((el) => getComputedStyle(el).fontSize)).toBe('28px')
	expect(await value.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
	await expect(page.locator('[data-testid="screens-tile"] .cn-kpi-card__glyph')).toHaveCount(0)
	await expect(page.locator('[data-testid="screens-tile-linked"] .cn-kpi-card__glyph')).toHaveCount(1)
	const glyph = await page.locator('[data-testid="screens-tile-linked"] .cn-kpi-card__glyph').evaluate((el) => el.getBoundingClientRect().width)
	expect(Math.round(glyph)).toBe(18)

	await open(page, '?screens=tile&plain=1')
	expect(await page.locator('[data-testid="screens-tile"] .cn-kpi-card__value').evaluate((el) => getComputedStyle(el).fontSize)).toBe('34px')
})

test('the dashboard title is an h1 of 28px with a 15px subtitle; without the look an h2 of 20px', async ({ page }) => {
	await open(page, '?screens=header')
	const h1 = page.locator('h1.cn-dashboard-page__title')
	expect(await h1.evaluate((el) => getComputedStyle(el).fontSize)).toBe('28px')
	expect(await page.locator('.cn-dashboard-page__description').evaluate((el) => getComputedStyle(el).fontSize)).toBe('15px')

	await open(page, '?screens=header&plain=1')
	expect(await page.locator('h2.cn-dashboard-page__title').evaluate((el) => getComputedStyle(el).fontSize)).toBe('20px')
})
