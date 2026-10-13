// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An avatar cell for a REFERENCED person (screens-avatar-cell-resolve): the
// chair column holds a participant uuid and shows initials and the name.
//
// WHY PLAYWRIGHT: the name comes through the real object store's fetch of the
// referenced object, and the initials circle is measured.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the Voorzitter cell shows the referenced participant as initials and name', async ({ page }) => {
	const uuid = '7d1c0f2e-1111-4222-8333-944455556666'
	await page.route('**/apps/openregister/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) }))
	await page.route(/\/apps\/openregister\/api\/objects\/decidiq\/meeting(\?|$)/, (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: '1', title: 'Raadsvergadering', chair: uuid }], total: 1, page: 1, pages: 1 }),
	}))
	await page.route(new RegExp('/apps/openregister/api/objects/decidiq/participant/' + uuid), (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ id: uuid, fullName: 'Anna de Vries' }),
	}))
	await page.goto('/?l8=chair-avatar', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="chair-avatar"]')
	await expect(host.getByText('Raadsvergadering')).toBeVisible({ timeout: 60_000 })

	const cell = host.locator('[data-testid="cn-cell-avatar-resolved"]')
	await expect(cell.locator('.cn-cell-renderer__avatar-name')).toHaveText('Anna de Vries')
	await expect(cell.locator('.cn-cell-renderer__avatar-initials')).toHaveText('AV')
	const box = await cell.locator('.cn-cell-renderer__avatar-initials').boundingBox()
	// The board draws the chair as a 28px circle (widgetProps.size: 28).
	expect(Math.round(box.width)).toBe(28)
	await expect(host.getByText(uuid)).toHaveCount(0)
})
