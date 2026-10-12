// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The workspace-filter chips, measured in a browser (screens-page-lenses).
//
// WHY PLAYWRIGHT: "34px segments in a 40px track on one row" and "the arrow
// key moves the choice" are layout and focus, which jsdom does not compute.
// The counts come through the real list request, stubbed here.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the chips are a 40px track of 34px segments on one row, with counts, and the arrow keys switch the lens', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/pipelinq/ticket**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [], total: 7 }),
	}))
	await page.route('**/apps/openregister/api/objects/pipelinq/lead**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [], total: 1 }),
	}))
	await page.goto('/?lenses=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const group = page.locator('[data-testid="cn-workspace-filter-chips"]')
	await group.waitFor({ state: 'visible', timeout: 60_000 })

	const buttons = group.locator('button')
	await expect(buttons).toHaveText(['Alle 8', 'Tickets 7', 'Leads 1', 'Opvolgingen 1'].map((t) => new RegExp(t.replace(' ', '\\s*'))))
	const track = await group.evaluate((el) => Math.round(el.getBoundingClientRect().height))
	const segment = await buttons.first().evaluate((el) => Math.round(el.getBoundingClientRect().height))
	expect(track).toBe(40)
	expect(segment).toBe(34)
	const tops = await buttons.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
	expect(new Set(tops).size).toBe(1)

	// The default lens shows both lists; Tickets hides the leads.
	await expect(page.locator('[data-testid="lens-tickets"]')).toBeVisible()
	await expect(page.locator('[data-testid="lens-leads"]')).toBeVisible()
	await buttons.first().focus()
	await page.keyboard.press('ArrowRight')
	await expect(page.locator('[data-testid="lens-value"]')).toHaveText('tickets')
	await expect(page.locator('[data-testid="lens-leads"]')).toHaveCount(0)
	await expect(page.locator('[data-testid="lens-tickets"]')).toBeVisible()
})
