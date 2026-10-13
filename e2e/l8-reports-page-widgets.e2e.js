// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A reports page draws dashboard widgets under its cards
// (screens-reports-page-widgets).
//
// WHY PLAYWRIGHT: the widget grid is the real dashboard page inside the real
// reports page, loaded on demand, with its figure from a stubbed read.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the highlighted report sits under the report cards with its link, figure and sub-line', async ({ page }) => {
	await page.route('**/apps/openregister/api/**', (route) => {
		const url = route.request().url()
		const body = url.includes('/aggregations/') ? { value: 58 } : { results: [], total: 58 }
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
	})
	await page.goto('/?l8=reports-widgets', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="reports-widgets"]')
	await host.locator('[data-testid="cn-reports-grid"]').waitFor({ state: 'visible', timeout: 60_000 })

	const section = host.locator('[data-testid="cn-reports-widgets"]')
	await expect(section.getByText('Vergaderingen en efficiëntie')).toBeVisible({ timeout: 60_000 })
	await expect(section.getByRole('link', { name: 'Hele rapportage' })).toBeVisible()
	await expect(section.locator('.cn-stat-widget__value')).toHaveText('58')
	await expect(section.locator('[data-testid="cn-stat-widget-note"]')).toHaveText('20 raad, 38 commissie')

	const grid = await host.locator('[data-testid="cn-reports-grid"]').boundingBox()
	const below = await section.boundingBox()
	expect(below.y).toBeGreaterThanOrEqual(grid.y + grid.height)
})
