// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A stacked board stat tile whose label wraps grows into its cell instead of
// clipping its content (?l7=stat-tile-fit, harness l7/StatTileFit.vue).
// dossiq's "Afgehandeld deze maand" at 1100 wide held 129px of content in a
// 114px tile and cut its last line. A tile that fits keeps its size.
//
// WHY PLAYWRIGHT: the claim is the rendered height of real text.

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test('a board stat tile with a wrapped label shows all its lines', async ({ page }) => {
	await page.goto('/?l7=stat-tile-fit', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const cells = page.locator('[data-testid="stat-tile-fit-cell"]')
	await cells.first().locator('.cn-kpi-card').waitFor({ state: 'visible', timeout: 60_000 })
	if (process.env.L11_SHOT) {
		await page.locator('[data-testid="stat-tile-fit"]').screenshot({ path: process.env.L11_SHOT })
	}
	const measure = (cell) => cell.evaluate((host) => {
		const box = host.getBoundingClientRect()
		const card = host.querySelector('.cn-kpi-card')
		const texts = [...card.querySelectorAll('.cn-kpi-card__title-text, .cn-kpi-card__value, [data-testid="cn-stat-widget-caption"]')]
		const range = document.createRange()
		range.selectNodeContents(card.querySelector('.cn-kpi-card__title-text'))
		return {
			labelLines: new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size,
			cut: card.scrollHeight > card.clientHeight + 0.5,
			textInside: texts.every((t) => t.getBoundingClientRect().bottom <= box.bottom + 0.5),
			cardHeight: Math.round(card.getBoundingClientRect().height),
		}
	})
	const wrapped = await measure(cells.nth(0))
	expect(wrapped.labelLines).toBe(2)
	expect(wrapped.cut).toBe(false)
	expect(wrapped.textInside).toBe(true)

	// A tile that fits keeps the cell's content height.
	const short = await measure(cells.nth(1))
	expect(short.cut).toBe(false)
	expect(short.cardHeight).toBe(118)
})
