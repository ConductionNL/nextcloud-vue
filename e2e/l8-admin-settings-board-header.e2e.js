// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An admin settings page under the board look without a CnAppRoot
// (screens-admin-settings-board-header): the path under the title, the
// Documentatie button, cards in two columns, and a wide section past 900px.
//
// WHY PLAYWRIGHT: the 900px cap is NcSettingsSection's own scoped CSS, and the
// two columns are the board grid: both are layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the board header has a path line, and a wide section is not capped at 900px', async ({ page }) => {
	await page.route('**/apps/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
	await page.goto('/?l8=admin-header', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="admin-header"]')
	await expect(host.getByRole('heading', { level: 1, name: 'Launchpad-beheer: algemeen' })).toBeVisible({ timeout: 60_000 })

	const crumbs = host.locator('[data-testid="cn-admin-settings-breadcrumbs"]')
	await expect(crumbs.getByRole('link', { name: 'Beheerinstellingen' })).toBeVisible()
	await expect(crumbs).toContainText('geldt voor de hele organisatie')
	await expect(host.locator('[data-testid="cn-admin-settings-documentation"]')).toBeVisible()

	// The wide section spans the grid, past NcSettingsSection's 900px.
	const sections = host.locator('.settings-section')
	const wide = await sections.nth(0).boundingBox()
	expect(wide.width).toBeGreaterThan(1000)
	// The two cards share a row.
	const left = await sections.nth(1).boundingBox()
	const right = await sections.nth(2).boundingBox()
	expect(Math.round(left.y)).toBe(Math.round(right.y))
	expect(right.x).toBeGreaterThan(left.x + left.width)
})
