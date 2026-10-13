// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A work list in sections (screens-record-list-row-action): each card shows
// its count after the title, and every row ends in one action whose label
// can follow the row's status.
//
// WHY PLAYWRIGHT: the real dashboard card, the real record list reads and the
// action's 150px by 34px pill at the end of the row.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('each section counts its rows and every row ends in its action', async ({ page }) => {
	await page.route('**/apps/openregister/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) }))
	await page.route(/\/apps\/openregister\/api\/objects\/decidiq\/motion(\?|$)/, (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [
			{ id: 'm-1', title: 'Motie zaterdagopening stadskantoor', bodyName: 'Commissie Bestuur', status: 'voting' },
			{ id: 'm-2', title: 'Amendement A1 op verlichting fietspaden', bodyName: 'Commissie Ruimte', status: 'voting' },
		], total: 2 }),
	}))
	await page.route(/\/apps\/openregister\/api\/objects\/decidiq\/action-item(\?|$)/, (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [
			{ id: 'a-1', title: 'Raadsinformatiebrief geluid A16 opstellen', origin: 'Uit vergadering Commissie Ruimte', status: 'busy' },
			{ id: 'a-2', title: 'Reactie op inspraak fietspaden verwerken', origin: 'Bij Raadsvoorstel verlichting fietspaden 2027', status: 'open' },
		], total: 5 }),
	}))
	await page.goto('/?l8=work-sections', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="work-sections"]')
	await expect(host.getByText('Motie zaterdagopening stadskantoor')).toBeVisible({ timeout: 60_000 })

	await expect(host.locator('[data-testid="cn-dashboard-widget-header-count"]')).toHaveText(['2', '5'])

	const actions = host.locator('[data-testid="cn-record-list-action"]')
	await expect(actions).toHaveText(['Stem uitbrengen', 'Stem uitbrengen', 'Afronden', 'Starten'])
	await expect(actions.nth(0)).toHaveAttribute('href', 'https://example.org/vote/m-1')
	await expect(actions.nth(2)).toHaveJSProperty('tagName', 'BUTTON')
	const box = await actions.nth(2).boundingBox()
	expect(Math.round(box.width)).toBe(150)
	expect(Math.round(box.height)).toBe(34)

	// The action ends the row: it is the right-most thing on it.
	const row = host.locator('.cn-record-list__row--action').nth(2)
	const rowBox = await row.boundingBox()
	expect(Math.round(rowBox.x + rowBox.width - (box.x + box.width))).toBeLessThanOrEqual(1)
})
