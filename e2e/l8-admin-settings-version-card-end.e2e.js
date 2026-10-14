// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The version card after the app's sections (screens-admin-settings-version-card-end):
// board DcBeheer starts with the app's own card, and re-import and the setup
// wizard stay on the page.
//
// WHY PLAYWRIGHT: the order is the board grid's placement, which is layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the app card comes first and the version card follows it', async ({ page }) => {
	await page.route('**/apps/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
	await page.goto('/?l8=admin-version-end', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="admin-version-end"]')
	await expect(host.getByRole('heading', { level: 1, name: 'Beheer' })).toBeVisible({ timeout: 60_000 })

	const organisation = await host.locator('[data-testid="app-organisation"]').boundingBox()
	const setup = host.locator('[data-testid="cn-admin-run-setup"]')
	await expect(setup).toBeVisible()
	const version = await setup.boundingBox()
	// Organisatie sits in the first grid cell: at the left edge, above the version card.
	expect(organisation.y).toBeLessThan(version.y)
	expect(organisation.x).toBeLessThan(400)
})
