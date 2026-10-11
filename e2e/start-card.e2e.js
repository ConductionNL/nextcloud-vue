// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The workspace-filter start card, measured in a browser (abstract-start-card).
//
// WHY PLAYWRIGHT: "the text sits left of the picker on one row" is layout,
// which jsdom does not compute. The first-object default is checked through the
// real request the widget sends, stubbed here.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the start card puts its text left of the picker and the first client in focus', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/pipelinq/client**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 'client-1', name: 'M. de Graaf' }], total: 1 }),
	}))
	await page.goto('/?startcard=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const card = page.locator('[data-testid="start-card-harness"] .cn-workspace-filter-widget--start')
	await card.waitFor({ state: 'visible', timeout: 60_000 })

	const text = await card.locator('.cn-workspace-filter-widget__text').boundingBox()
	const picker = await card.locator('[data-testid="cn-workspace-filter-object"]').boundingBox()
	const link = await card.locator('[data-testid="cn-workspace-filter-link"]').boundingBox()
	// One row: the picker starts right of the text, the link right of the picker.
	expect(picker.x).toBeGreaterThanOrEqual(text.x + text.width)
	expect(link.x).toBeGreaterThanOrEqual(picker.x + picker.width)
	expect(picker.y).toBeLessThan(text.y + text.height)

	const title = await card.locator('.cn-workspace-filter-widget__title').evaluate((el) => {
		const cs = getComputedStyle(el)
		return { size: cs.fontSize, weight: cs.fontWeight }
	})
	expect(title.size).toBe('17px')
	expect(Number(title.weight)).toBeGreaterThanOrEqual(700)

	// The first client is in focus without a pick.
	await expect(page.locator('[data-testid="start-card-focus"]')).toHaveText('client-1')
})
