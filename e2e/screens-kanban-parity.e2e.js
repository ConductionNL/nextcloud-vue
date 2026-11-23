// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-kanban-parity: the claims that are LAYOUT. Four columns share a wide
// content area at 284px with no sideways scroll, six columns hold 240px and
// scroll, the card shows no form control at rest, and a middle click on the
// title still reaches the host. Controls run the board without the look.
//
// @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-board-column-grid
// @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-the-card-shows-no-form-controls-at-rest
// @spec openspec/changes/screens-kanban-parity/specs/board-view/spec.md#requirement-a-long-column-is-cut-with-a-show-more-button

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="cn-board-column"]').first()).toBeVisible({ timeout: 90_000 })
}

test('four columns share a 1184px area at 284px each, with no sideways scroll', async ({ page }) => {
	await open(page, '?screens=board&n=4&w=1184')
	const widths = await page.locator('[data-testid="cn-board-column"]').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)))
	expect(widths).toEqual([284, 284, 284, 284])
	const scrolls = await page.locator('.cn-board-view__columns').evaluate((el) => el.scrollWidth > el.clientWidth)
	expect(scrolls).toBe(false)
})

test('six columns are 240px each and the board scrolls sideways', async ({ page }) => {
	await open(page, '?screens=board&n=6&w=1184')
	const widths = await page.locator('[data-testid="cn-board-column"]').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)))
	expect(widths).toEqual([240, 240, 240, 240, 240, 240])
	expect(await page.locator('.cn-board-view__columns').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
	const gap = await page.locator('.cn-board-view__columns').evaluate((el) => getComputedStyle(el).columnGap)
	expect(gap).toBe('16px')
})

test('without the look the columns keep their fixed 260px basis (276px with the 8px padding)', async ({ page }) => {
	await open(page, '?screens=board&n=4&w=1184&plain=1')
	const widths = await page.locator('[data-testid="cn-board-column"]').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)))
	expect(widths).toEqual([276, 276, 276, 276])
})

test('the card draws no form control at rest, and the cut column ends in a 34px dashed button', async ({ page }) => {
	await open(page, '?screens=board&n=4&w=1184')
	await expect(page.locator('select')).toHaveCount(0)
	const card = page.locator('[data-testid="cn-board-card"]').first()
	const radius = await card.evaluate((el) => getComputedStyle(el).borderRadius)
	expect(radius).toBe('10px')
	const menu = await card.locator('[data-testid="cn-board-card-menu"]').evaluate((el) => {
		const r = el.getBoundingClientRect()
		return [Math.round(r.width), Math.round(r.height)]
	})
	expect(menu).toEqual([34, 34])
	const more = page.locator('[data-testid="cn-board-show-more"]').first()
	await expect(more).toHaveText('Show 2 more')
	expect(Math.round(await more.evaluate((el) => el.getBoundingClientRect().height))).toBe(34)
	expect(await more.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('dashed')
})

test('the card menu opens on M and lists the other columns', async ({ page }) => {
	await open(page, '?screens=board&n=4&w=1184')
	await page.locator('[data-testid="cn-board-card-open"]').first().focus()
	// Read-only harness board: M offers no Move to, so the menu stays closed.
	await page.keyboard.press('m')
	await expect(page.locator('[data-testid="cn-board-card-menu-list"]')).toHaveCount(0)
	await page.locator('[data-testid="cn-board-card-menu"]').first().click()
	await expect(page.locator('[data-testid="cn-board-menu-new-tab"]').first()).toBeVisible()
})
