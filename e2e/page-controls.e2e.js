// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The page bar and the list that listens to it, in a browser (screens-page-controls).
//
// WHY PLAYWRIGHT: "chips left, switch and select on the right, on one row" is
// layout, and the sort and the dropped status filter are checked on the real
// request the list sends, stubbed here.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the bar holds chips, switch and select on one row, and the list follows the switch and the select', async ({ page }) => {
	const urls = []
	await page.route('**/apps/openregister/api/objects/pipelinq/ticket**', (route) => {
		urls.push(decodeURIComponent(route.request().url()))
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: [{ id: 't1', title: 'Afvalpas' }], total: 1 }),
		})
	})
	await page.goto('/?pagecontrols=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const bar = page.locator('.page-controls-harness__bar')
	await bar.locator('[data-testid="cn-workspace-filter-chips"]').waitFor({ state: 'visible', timeout: 60_000 })

	const chips = await bar.locator('[data-testid="cn-workspace-filter-chips"]').boundingBox()
	const toggle = await bar.locator('[data-testid="cn-workspace-filter-toggle"]').boundingBox()
	const select = await bar.locator('[data-testid="cn-workspace-filter-select"]').boundingBox()
	// One row: chips left, then the switch, then the select, the switch pushed right.
	expect(toggle.x).toBeGreaterThan(chips.x + chips.width)
	expect(select.x).toBeGreaterThan(toggle.x)
	expect(Math.abs((toggle.y + toggle.height / 2) - (chips.y + chips.height / 2))).toBeLessThan(12)

	await expect.poll(() => urls.length).toBeGreaterThan(0)
	const first = urls.at(-1)
	expect(first).toContain('_order[slaDeadline]=asc')
	expect(first).toContain('status[in][]=new')

	// "Toon afgerond" removes the status filter.
	await bar.getByText('Toon afgerond').click()
	await expect.poll(() => urls.at(-1)).not.toContain('status[in]')
	expect(urls.at(-1)).toContain('assignee=me')
})
