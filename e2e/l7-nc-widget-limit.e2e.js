// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A Nextcloud dashboard widget with a `limit` fits its cell
// (?l7=nc-widget-limit, harness l7/NcWidgetLimit.vue). Launchpad's activity
// widget drew a 411px list in a 172px body and scrolled inside its cell. With
// `limit: 2` the list holds two items and the link, nothing scrolls, and "Show all" goes
// to the widget's own page.
//
// WHY PLAYWRIGHT: whether a list scrolls inside its box is layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const ITEMS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: String(n), title: `Activiteit ${n}`, subtitle: 'vandaag', link: `/apps/activity/${n}` }))

/**
 * @param {import('@playwright/test').Page} page The page.
 */
async function stub(page) {
	await page.addInitScript(() => {
		window.OCA = { Dashboard: { widgets: { activity: { title: 'Activiteit', url: '/apps/activity/' } } } }
	})
	await page.route('**/ocs/v2.php/apps/dashboard/api/v2/widget-items**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ ocs: { meta: { status: 'ok' }, data: { activity: { items: ITEMS } } } }),
	}))
}

/**
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<{items: number, scrolls: boolean}>} What the body holds.
 */
function body(page) {
	return page.locator('[data-testid="nc-widget-limit"] .cn-nc-widget-widget__body').evaluate((el) => ({
		items: el.querySelectorAll('.cn-nc-widget-widget__item').length,
		scrolls: el.scrollHeight > el.clientHeight + 1,
	}))
}

test('with a limit the list fits its cell and links to the rest', async ({ page }) => {
	await stub(page)
	await page.goto('/?l7=nc-widget-limit', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="nc-widget-limit"]')
	await host.locator('.cn-nc-widget-widget__item').first().waitFor({ state: 'visible', timeout: 60_000 })
	expect(await body(page)).toEqual({ items: 2, scrolls: false })
	const all = host.locator('[data-testid="nc-widget-show-all"]')
	await expect(all).toHaveText('Alle activiteit')
	await expect(all).toHaveAttribute('href', '/apps/activity/')
	await expect(all).toBeInViewport()
})

test('without a limit the same cell scrolls (control)', async ({ page }) => {
	await stub(page)
	await page.goto('/?l7=nc-widget-limit&nolimit=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="nc-widget-limit"] .cn-nc-widget-widget__item').first().waitFor({ state: 'visible', timeout: 60_000 })
	const drawn = await body(page)
	expect(drawn.items).toBe(7)
	expect(drawn.scrolls).toBe(true)
})
