// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A narrow KPI tile reads its caption and its label in full, over two lines,
// as the DqDashboard board does. Found on the dossiq dashboard on 11 October
// 2026 (F4): the caption read "haalden hun termi…" and the label "Afgehandeld
// deze maand" was cut at the tile edge, both held to one line. Line counts
// only exist in a real browser; jsdom lays nothing out.
//
// @spec openspec/changes/dashboard-tile-text-fits/specs/dashboard-tile-text-fits/spec.md#requirement-a-kpi-tiles-caption-and-board-label-wrap-to-two-lines

import { expect, test } from '@playwright/test'

/**
 * Open a harness scenario and wait for the stat tiles.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The query string.
 */
async function open(page, query) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="screens-kpicaption-tile"] .cn-stat-widget')).toHaveCount(2)
}

/**
 * Measure each tile's label, title row, badge and caption.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<Array<object>>} One entry per tile.
 */
async function measure(page) {
	return page.locator('[data-testid="screens-kpicaption-tile"]').evaluateAll((tiles) => tiles.map((tile) => {
		const lines = (el) => {
			const range = document.createRange()
			range.selectNodeContents(el)
			const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2
			return Math.round(range.getBoundingClientRect().height / lineHeight)
		}
		const cut = (el) => el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5
		const label = tile.querySelector('.cn-kpi-card__title-text')
		const title = tile.querySelector('.cn-kpi-card__title')
		const caption = tile.querySelector('[data-testid="cn-stat-widget-caption"]')
		const badge = tile.querySelector('[data-testid="cn-stat-widget-icon-badge"]')
		const card = tile.querySelector('.cn-kpi-card')
		return {
			label: label.textContent.trim(),
			labelLines: lines(label),
			labelCut: cut(label),
			titleCut: cut(title),
			caption: caption.textContent.trim(),
			captionLines: lines(caption),
			captionCut: cut(caption),
			badgeWidth: badge ? badge.getBoundingClientRect().width : null,
			cardCut: card.scrollHeight > card.clientHeight + 0.5,
		}
	}))
}

test.describe('a narrow KPI tile', () => {
	test('wraps a long caption and a long label over two lines in the board look', async ({ page }) => {
		await open(page, '?screens=kpicaption')
		const [done, inTime] = await measure(page)

		expect(inTime.caption).toBe('haalden hun termijn, naar doorlooptijd')
		expect(inTime.captionCut).toBe(false)
		expect(inTime.captionLines).toBe(2)

		expect(done.label).toBe('Afgehandeld deze maand')
		expect(done.labelCut).toBe(false)
		expect(done.titleCut).toBe(false)
		expect(done.labelLines).toBe(2)

		for (const tile of [done, inTime]) {
			expect(tile.badgeWidth).toBe(32)
			expect(tile.cardCut).toBe(false)
		}
	})

	test('control: without the board look the label keeps one line', async ({ page }) => {
		await open(page, '?screens=kpicaption&plain=1')
		const [done] = await measure(page)
		expect(done.labelLines).toBe(1)
	})
})
