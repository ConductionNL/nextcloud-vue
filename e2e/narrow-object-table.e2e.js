// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A narrow object-table tile keeps its trailing column in view, and an empty
// tile's sentence wraps. Found on the dossiq dashboard on 10 October 2026: the
// "Recently opened" tile drew a 444px table in a 342px tile, so the date was
// cut off, and the lens reason was cut to one line with an ellipsis. Widths
// only exist in a real browser; jsdom lays nothing out.
//
// @spec openspec/changes/narrow-object-table-widgets/specs/narrow-object-table-widgets/spec.md#requirement-a-narrow-object-table-keeps-its-trailing-columns-in-view
// @spec openspec/changes/narrow-object-table-widgets/specs/narrow-object-table-widgets/spec.md#requirement-the-empty-text-of-a-table-wraps

import { expect, test } from '@playwright/test'

/**
 * Measure the rows tile: the tile box, the table box, and per row the date
 * cell and the title cell.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<object>} The measurements.
 */
async function measureRows(page) {
	return page.locator('[data-testid="narrow-table-rows"]').evaluate((tile) => {
		const tileBox = tile.getBoundingClientRect()
		const table = tile.querySelector('table')
		const rows = [...tile.querySelectorAll('tbody tr')].map((tr) => {
			const cells = tr.querySelectorAll('td')
			const title = cells[1]
			const date = cells[2]
			return {
				dateRight: date.getBoundingClientRect().right,
				titleClipped: title.scrollWidth > title.clientWidth,
				othersClipped: [cells[0], date].some((td) => td.scrollWidth > td.clientWidth),
				titleOverflow: getComputedStyle(title).textOverflow,
			}
		})
		return { tileRight: tileBox.right, tableWidth: table.getBoundingClientRect().width, tileWidth: tileBox.width, rows }
	})
}

test.describe('a narrow object-table tile', () => {
	test('control: without fitWidth the table runs past the tile', async ({ page }) => {
		await page.goto('/?narrowtable=1&plain=1')
		const m = await measureRows(page)
		expect(m.tableWidth).toBeGreaterThan(m.tileWidth + 1)
	})

	test('keeps the date in view and cuts the title instead', async ({ page }) => {
		await page.goto('/?narrowtable=1')
		const m = await measureRows(page)
		expect(m.tableWidth).toBeLessThanOrEqual(m.tileWidth + 0.5)
		for (const row of m.rows) {
			expect(row.dateRight).toBeLessThanOrEqual(m.tileRight + 0.5)
		}
		// The title is the column that gives way, with an ellipsis; the
		// identifier and the date keep their whole text.
		expect(m.rows[0].titleClipped).toBe(true)
		expect(m.rows[0].titleOverflow).toBe('ellipsis')
		for (const row of m.rows) {
			expect(row.othersClipped).toBe(false)
		}
	})

	test('wraps the sentence of an empty tile', async ({ page }) => {
		await page.goto('/?narrowtable=1')
		const m = await page.locator('[data-testid="narrow-table-empty"] .cn-table-empty td').evaluate((td) => {
			const lineHeight = parseFloat(getComputedStyle(td).lineHeight) || 20
			const range = document.createRange()
			range.selectNodeContents(td)
			return {
				textHeight: range.getBoundingClientRect().height,
				lineHeight,
				clipped: td.scrollWidth > td.clientWidth,
			}
		})
		expect(m.clipped).toBe(false)
		expect(m.textHeight).toBeGreaterThan(m.lineHeight * 1.5)
	})
})
