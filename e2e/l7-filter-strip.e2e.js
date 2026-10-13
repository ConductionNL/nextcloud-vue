// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A second filter strip on an index page (?l7=filter-strip, harness
// l7/FilterStrip.vue), as board PqWachtrij draws the channel strip under the
// kind tabs: "Alle" and one pill per channel with its count, the active one
// in ink. The counts follow the active quick filter.
//
// WHY PLAYWRIGHT: the count requests go over the wire (stubbed), the pills'
// size and colours are computed style.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the channel strip counts within the kind tab and filters the list', async ({ page }) => {
	const asked = []
	await page.route('**/apps/openregister/api/objects/aggregations/pipelinq/ticket/**', (route) => {
		const url = new URL(route.request().url())
		asked.push(decodeURIComponent(url.search))
		const complaints = decodeURIComponent(url.search).includes('kind') && decodeURIComponent(url.search).includes('complaint')
		if (url.searchParams.get('groupBy') === 'channel') {
			const groups = complaints ? [{ key: 'web', value: 1 }, { key: 'email', value: 1 }] : [{ key: 'web', value: 5 }, { key: 'email', value: 2 }, { key: 'desk', value: 2 }]
			return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ groups }) })
		}
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ value: complaints ? 2 : 9 }) })
	})
	await page.goto('/?l7=filter-strip', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const strip = page.locator('[data-testid="cn-index-filter-strip"]')
	await strip.waitFor({ state: 'visible', timeout: 60_000 })
	const pills = strip.locator('.cn-index-page__filter-strip-pill')
	await expect(pills).toHaveText(['Alle 9', 'Mijn Zuiddrecht 5', 'E-mail 2', 'Balie 2'])
	await expect(strip).toHaveAttribute('aria-label', 'Kanaal')

	const box = await pills.nth(0).evaluate((el) => {
		const style = getComputedStyle(el)
		return { height: Math.round(el.getBoundingClientRect().height), radius: style.borderTopLeftRadius, bg: style.backgroundColor }
	})
	expect(box.height).toBe(34)
	expect(box.radius).toBe('17px')
	const idleBg = await pills.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor)
	expect(box.bg).not.toBe(idleBg)

	// A channel filters the list and is the pressed pill.
	await pills.nth(2).click()
	await expect(pills.nth(2)).toHaveAttribute('aria-pressed', 'true')
	await expect(page.locator('[data-testid="filter-strip"] tbody tr')).toHaveCount(1)

	// The counts follow the kind tab.
	await page.locator('[data-testid="filter-strip"]').getByRole('button', { name: /Klachten/ }).first().click()
	await expect(pills).toHaveText(['Alle 2', 'Mijn Zuiddrecht 1', 'E-mail 1', 'Balie 0'])
})
