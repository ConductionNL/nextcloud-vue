// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A week strip with a cap per day, in a browser (screens-week-strip-max-per-day):
// a day with eight items stays inside a 320px cell and opens in place.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a full day shows three items and "+5 more", fits its cell, and opens in place', async ({ page }) => {
	await page.goto('/?l6=week-strip-max-per-day', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const strip = page.locator('[data-testid="cn-week-strip"]')
	await strip.waitFor({ state: 'visible', timeout: 60_000 })

	const items = page.locator('[data-testid="cn-week-strip-item"]')
	const more = page.locator('[data-testid="cn-week-strip-more"]')
	await expect(items).toHaveCount(3)
	await expect(more).toHaveText(/^\+5 (more|meer)$/)
	const height = await strip.evaluate((el) => el.getBoundingClientRect().height)
	expect(height).toBeLessThanOrEqual(320)

	await more.click()
	await expect(items).toHaveCount(8)
	await expect(more).toHaveText(/^(Show less|Minder tonen)$/)
})
