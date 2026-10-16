// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// page-header-breadcrumb: a list, dashboard or settings page draws a breadcrumb
// and a meta note under its title, on one line in the detail header's row
// style: "Instellingen / Zaaktypen · 14 zaaktypen".
//
// WHY PLAYWRIGHT: "one line, in this order" is layout, which only a browser
// computes.
//
// @spec openspec/changes/page-header-breadcrumb/specs/page-header/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Locator} trail The trail row.
 * @return {Promise<void>}
 */
async function expectOneLine(trail) {
	const crumbs = await trail.locator('.cn-detail-page__breadcrumbs').boundingBox()
	const meta = await trail.locator('.cn-detail-page__header-meta').boundingBox()
	expect(Math.abs((crumbs.y + crumbs.height / 2) - (meta.y + meta.height / 2))).toBeLessThan(6)
	expect(meta.x).toBeGreaterThan(crumbs.x)
}

test('a page header and a dashboard draw the breadcrumb and the meta on one line', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/?l8=page-header-trail', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="page-header-trail"]')
	await expect(root).toBeVisible({ timeout: 90_000 })

	const header = root.locator('[data-testid="trail-header"] [data-testid="cn-header-trail"]')
	await expect(header).toBeVisible()
	await expect(header.getByRole('link', { name: 'Instellingen' })).toBeVisible()
	await expect(header).toContainText('Zaaktypen')
	await expect(header.locator('.cn-detail-page__header-meta')).toHaveText('14 zaaktypen')
	await expectOneLine(header)

	const dash = root.locator('[data-testid="trail-dashboard"] [data-testid="cn-header-trail"]')
	await expect(dash.getByRole('link', { name: 'Organisatie' })).toBeVisible()
	await expect(dash.locator('.cn-detail-page__header-meta')).toHaveText('Geldt voor de hele organisatie')
	await expectOneLine(dash)
})
