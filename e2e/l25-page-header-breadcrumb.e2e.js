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

test.describe.configure({ timeout: 120_000 })

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

test('a dashboard puts its period on the description line and a card subtitle under its title', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.goto('/?l8=page-header-trail', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const dash = page.locator('[data-testid="trail-dashboard"]')
	const line = dash.locator('[data-testid="cn-dashboard-page-subtitle"]')
	await expect(line).toContainText('Week 41 · alle teams', { timeout: 90_000 })
	const group = line.locator('[data-testid="cn-dashboard-page-date-segmented"]')
	await expect(group).toBeVisible()
	const text = await line.locator('span').first().boundingBox()
	const box = await group.boundingBox()
	expect(Math.abs((text.y + text.height / 2) - (box.y + box.height / 2))).toBeLessThan(8)
	expect(box.x).toBeGreaterThan(text.x + text.width)
	await expect(dash.locator('[data-testid="cn-widget-wrapper-subtitle"]')).toHaveText('Dit kwartaal, beslist binnen de termijn')
})
