// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The store page's title under the board look (screens-store-page-board-header):
// with the navigation open it sits flush with the content, 28px from the
// page's left edge as the board's frame pads every page, not 72px.
//
// WHY PLAYWRIGHT: the offset is the product of the page padding and the
// header inset, both CSS: layout jsdom does not compute.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the store title, description and search start at the same left edge, 28px in', async ({ page }) => {
	await page.route('**/apps/launchpad/api/store/items**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ outcome: 'ok', cards: [{ slug: 'zaken', title: 'Zaken', description: 'Een startpagina voor zaken.', kind: 'app-template', publisher: 'Conduction', version: '1.0.0' }] }),
	}))
	await page.goto('/?l8=store-header', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="store-header-host"]')
	await host.locator('[data-testid="store-results"]').waitFor({ state: 'visible', timeout: 60_000 })

	const left = (await host.boundingBox()).x
	const title = await host.locator('.cn-store-page__title').boundingBox()
	const intro = await host.locator('.cn-store-page__intro').boundingBox()
	const controls = await host.locator('.cn-store-page__controls').boundingBox()
	expect(Math.round(title.x - left)).toBe(28)
	expect(Math.round(intro.x)).toBe(Math.round(title.x))
	expect(Math.round(controls.x)).toBe(Math.round(title.x))
})
