// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// In the board look the open tab flows into ONE content block (the DqZaak
// board). A data widget in the panel renders chromeless, but the board's card
// rule gave its wrapper a border and a 12px radius again: a second card inside
// the panel, whose left edge ran down from the open tab and whose rounded top
// right drew a line across the top right of the content block.
//
// Geometry and the cascade, so a real browser. The board stylesheets are put
// FIRST in the head, the order the built library ships them in (they precede
// the component styles in dist/nextcloud-vue.css), so ties resolve as they do
// in an app.

import { expect, test } from '@playwright/test'
import fs from 'fs'

const BOARD_CSS = ['src/css/look-board.css', 'src/css/look-board-detail.css']
	.map((file) => fs.readFileSync(file, 'utf8'))
	.join('\n')

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * Open the board-look tabs harness with the look's stylesheets in place.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the panel content is rendered.
 */
async function openHarness(page) {
	await page.goto('/?tabswidget=board', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('.tabs-board .cn-tabs__content .cn-widget-wrapper').first().waitFor({ state: 'visible', timeout: 60_000 })
	await page.evaluate((text) => {
		const style = document.createElement('style')
		style.textContent = text
		document.head.prepend(style)
	}, BOARD_CSS)
}

test.describe('CnTabsWidget in the board look', () => {
	test('the harness renders the board strip with a widget in the panel (precondition)', async ({ page }) => {
		await openHarness(page)
		await expect(page.locator('.tabs-board .cn-tabs--board')).toHaveCount(1)
		await expect(page.locator('.tabs-board .cn-tabs__nav-item--active')).toHaveCount(1)
	})

	test('the panel holds no second card: nothing inside it draws a border', async ({ page }) => {
		await openHarness(page)
		const bordered = await page.evaluate(() => {
			const panel = document.querySelector('.tabs-board .cn-tabs__content')
			const panelWidth = panel.getBoundingClientRect().width
			return [...panel.querySelectorAll('*')]
				.filter((el) => el.getBoundingClientRect().width > panelWidth / 2)
				.filter((el) => {
					const cs = getComputedStyle(el)
					return ['Top', 'Right', 'Left'].some((side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none')
				})
				.map((el) => el.className)
		})
		expect(bordered).toEqual([])
	})

	// design-system#147: the card carries its full border, the strip draws no
	// line, and the open tab overlaps the card's top border by 1px, painted
	// above it, so it flows into the card as a folder tab.
	test('the strip draws no line and the card carries its own top border', async ({ page }) => {
		await openHarness(page)
		const edges = await page.evaluate(() => {
			const bar = document.querySelector('.tabs-board .cn-tabs__bar')
			const after = getComputedStyle(bar, '::after')
			const panel = getComputedStyle(document.querySelector('.tabs-board .cn-tabs__content'))
			return {
				barBottom: parseFloat(getComputedStyle(bar).borderBottomWidth),
				afterDrawn: after.content !== 'none' && after.content !== 'normal' && parseFloat(after.borderBottomWidth) > 0,
				panelTop: parseFloat(panel.borderTopWidth),
				panelRadiusTopRight: parseFloat(panel.borderTopRightRadius),
			}
		})
		expect(edges.barBottom).toBe(0)
		expect(edges.afterDrawn).toBe(false)
		expect(edges.panelTop).toBe(1)
		expect(edges.panelRadiusTopRight).toBeGreaterThan(0)
	})

	test('the open tab overlaps the card top border by 1px and paints over it', async ({ page }) => {
		await openHarness(page)
		const join = await page.evaluate(() => {
			const tabEl = document.querySelector('.tabs-board .cn-tabs__nav-item--active')
			const tab = tabEl.getBoundingClientRect()
			const panel = document.querySelector('.tabs-board .cn-tabs__content').getBoundingClientRect()
			const hit = document.elementFromPoint(tab.left + tab.width / 2, panel.top + 0.5)
			return { overlap: Math.round(tab.bottom - panel.top), topIsTab: tabEl.contains(hit) }
		})
		expect(join.overlap).toBe(1)
		expect(join.topIsTab).toBe(true)
	})
})
