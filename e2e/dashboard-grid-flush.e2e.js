// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// dashboard-grid-flush: in the board look the grid's cards line up with the
// KPI row and the page edge. GridStack insets every card by the grid margin,
// so without the fix the first card started 12px right of the KPI row
// (x=305 against 293 on the boards). Measured at a desktop and a phone width.
//
// WHY PLAYWRIGHT: the inset is layout, which jsdom does not compute.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {number} width The viewport width.
 * @return {Promise<{kpi: Array<number>, cards: Array<{l: number, r: number}>, kpiRight: number}>} Edges.
 */
async function edges(page, width) {
	await page.setViewportSize({ width, height: 900 })
	await page.route('**/apps/openregister/**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ value: 3, total: 1, results: [{ id: 'a', title: 'Afvalpas werkt niet' }] }),
	}))
	await page.goto('/?l4=phone-board', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('.cn-dashboard-page__kpi-cell').first().waitFor({ state: 'visible', timeout: 60_000 })
	await page.locator('.grid-stack-item-content').first().waitFor({ state: 'visible', timeout: 60_000 })
	return page.evaluate(() => {
		const kpi = [...document.querySelectorAll('.cn-dashboard-page__kpi-cell')].map((el) => el.getBoundingClientRect())
		const cards = [...document.querySelectorAll('.grid-stack-item-content')].map((el) => el.getBoundingClientRect())
		return {
			kpi: kpi.map((r) => Math.round(r.left)),
			kpiRight: Math.round(Math.max(...kpi.map((r) => r.right))),
			cards: cards.map((r) => ({ l: Math.round(r.left), r: Math.round(r.right) })),
		}
	})
}

test('at 1280px the first card starts where the KPI row starts and the last ends where it ends', async ({ page }) => {
	const m = await edges(page, 1280)
	const left = Math.min(...m.kpi)
	expect(Math.min(...m.cards.map((c) => c.l))).toBe(left)
	expect(Math.max(...m.cards.map((c) => c.r))).toBe(m.kpiRight)
})

test('at 390px every card starts where the KPI tiles start', async ({ page }) => {
	const m = await edges(page, 390)
	const left = Math.min(...m.kpi)
	m.cards.forEach((c) => expect(c.l).toBe(left))
})
