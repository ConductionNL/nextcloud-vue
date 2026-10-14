// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Sections inside a wrapping element are cards (screens-admin-settings-nested-section-cards):
// an app settings component that wraps its sections in one element still gets
// the board's cards, side by side in the grid.
//
// WHY PLAYWRIGHT: the grid placement and the card box are layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('wrapped sections are cards side by side', async ({ page }) => {
	await page.route('**/apps/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
	await page.goto('/?l8=admin-nested-sections', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="admin-nested-sections"]')
	await expect(host.getByRole('heading', { level: 1, name: 'Beheer' })).toBeVisible({ timeout: 60_000 })

	const organisation = host.locator('[data-testid="nested-organisation"]')
	const register = host.locator('[data-testid="nested-register"]')
	const left = await organisation.boundingBox()
	const right = await register.boundingBox()
	// Side by side in the grid.
	expect(Math.round(left.y)).toBe(Math.round(right.y))
	expect(right.x).toBeGreaterThan(left.x + left.width)
	// Drawn as a card: a border and the padding of the board card.
	const style = await organisation.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { border: cs.borderTopWidth, padding: cs.paddingTop }
	})
	expect(style.border).toBe('1px')
	expect(style.padding).toBe('22px')
})
