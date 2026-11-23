// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The index toolbar shows state only when there is state
// (?l7=filter-menu-count, harness l7/FilterMenuCount.vue): the count on the
// Filter MENU button (boards DqZaken and PqTickets draw "Filter 2"), the
// "Active:" chips with "Clear all", and the bulk band.
//
// WHY PLAYWRIGHT: the count is a pseudo-element; jsdom draws none.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<{content: string, height: string, background: string}>} The badge as drawn.
 */
function badge(page) {
	return page.locator('[data-testid="cn-index-filter-menu"] .button-vue__text').first().evaluate((el) => {
		const style = getComputedStyle(el, '::after')
		return { content: style.content, height: style.height, background: style.backgroundColor }
	})
}

test('without filters or a selection the toolbar shows no count, no chips and no bulk band', async ({ page }) => {
	await page.goto('/?l7=filter-menu-count', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="filter-menu-count"]')
	await host.locator('[data-testid="cn-index-filter-menu"]').waitFor({ state: 'visible', timeout: 60_000 })
	expect((await badge(page)).content).toBe('none')
	await expect(host.locator('[data-testid="cn-actions-bar-active-label"]')).toHaveCount(0)
	await expect(host.locator('[data-testid="cn-actions-bar-clear-all"]')).toHaveCount(0)
	await expect(host.locator('[data-testid="cn-bulk-band"]')).toHaveCount(0)
})

test('two active filters: the Filter menu button counts them, the chips and Clear all show', async ({ page }) => {
	await page.goto('/?l7=filter-menu-count&active=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="filter-menu-count"]')
	const menu = host.locator('[data-testid="cn-index-filter-menu"]')
	await menu.waitFor({ state: 'visible', timeout: 60_000 })
	const drawn = await badge(page)
	expect(drawn.content).toBe('"2"')
	expect(drawn.height).toBe('20px')
	expect(drawn.background).not.toBe('rgba(0, 0, 0, 0)')
	await expect(host.locator('[data-testid="cn-actions-bar-filter-chip"]')).toHaveCount(2)
	await expect(host.locator('[data-testid="cn-actions-bar-clear-all"]')).toBeVisible()
	await expect(host.locator('[data-testid="cn-bulk-band"]')).toHaveCount(0)
})

test('a selection shows the bulk band', async ({ page }) => {
	await page.goto('/?l7=filter-menu-count&selected=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="filter-menu-count"]')
	await host.locator('[data-testid="cn-index-filter-menu"]').waitFor({ state: 'visible', timeout: 60_000 })
	await expect(host.locator('[data-testid="cn-bulk-band"]')).toBeVisible()
})
