// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A stat tile's caption shows a share of a total (?l7=l16-age-share, harness
// l7/L16AgeShare.vue), as board ShDebiteurenbeheer's age tiles read
// "15% van open" under the amount.
//
// WHY PLAYWRIGHT: two real aggregation requests through the real registry and
// dashboard, and the caption's place under the number is layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the caption under the amount reads its share of the open total', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/aggregations/shillinq/ARInvoice/value**', (route) => {
		const open = decodeURIComponent(route.request().url()).includes('filter[open]')
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ value: open ? 96410 : 14320 }) })
	})
	await page.goto('/?l7=l16-age-share', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const tile = page.locator('[data-testid="l16-age-share"] .cn-stat-widget')
	await tile.waitFor({ state: 'visible', timeout: 60_000 })
	const caption = tile.locator('[data-testid="cn-stat-widget-caption"]')
	await expect(caption).toHaveText('15% van open')
	const under = await tile.evaluate((el) => el.querySelector('[data-testid="cn-stat-widget-caption"]').getBoundingClientRect().top >= el.querySelector('.cn-stat-widget__value').getBoundingClientRect().bottom - 1)
	expect(under).toBe(true)
})
