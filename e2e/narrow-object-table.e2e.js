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
// @spec openspec/changes/dashboard-tile-text-fits/specs/dashboard-tile-text-fits/spec.md#requirement-the-secondary-line-of-a-narrow-tables-growing-column-sits-under-the-value

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

	// Found on the dossiq dashboard on 11 October 2026 (F7): in the board look
	// the case number sat beside the title in the one-line cell and ran out of
	// the tile. It belongs on a line of its own under the title.
	test('puts the case number under the title, inside the cell, in the board look', async ({ page }) => {
		await page.goto('/?narrowtable=1&board=1')
		const rows = await page.locator('[data-testid="narrow-table-rows"] tbody tr').evaluateAll((trs) => trs.map((tr) => {
			const td = tr.querySelector('td.cn-table-col--title')
			const value = td.querySelector('.cn-cell-renderer')
			const secondary = td.querySelector('.cn-table-cell__secondary')
			const cell = td.getBoundingClientRect()
			const sec = secondary.getBoundingClientRect()
			const range = document.createRange()
			range.selectNodeContents(secondary)
			const text = range.getBoundingClientRect()
			return {
				text: secondary.textContent.trim(),
				belowValue: sec.top >= value.getBoundingClientRect().bottom - 1,
				textInsideCell: text.left >= cell.left - 0.5 && text.left < cell.right,
				startsAtCellStart: Math.abs(sec.left - (cell.left + parseFloat(getComputedStyle(td).paddingLeft))) <= 1,
				insideCell: sec.right <= cell.right + 0.5 && sec.bottom <= cell.bottom + 0.5,
				display: getComputedStyle(secondary).display,
				overflow: getComputedStyle(secondary).textOverflow,
				underlined: getComputedStyle(td).textDecorationLine,
				float: getComputedStyle(secondary).float,
			}
		}))
		expect(rows.length).toBe(2)
		for (const row of rows) {
			expect(row.text).toMatch(/^ZAAK-2026-/)
			expect(row.belowValue).toBe(true)
			expect(row.startsAtCellStart).toBe(true)
			expect(row.textInsideCell).toBe(true)
			expect(row.insideCell).toBe(true)
			expect(row.display).toBe('block')
			expect(row.overflow).toBe('ellipsis')
			// The board look underlines the title cell. A computed style cannot
			// show a propagated underline, so assert what keeps it off the
			// number: the line is out of the flow (a float), where a cell's
			// underline does not reach.
			expect(row.underlined).toContain('underline')
			expect(row.float).not.toBe('none')
		}
	})
})

test.describe('a list widget wider than its card', () => {
	// Ruben: no inner scrollbars. A table widget in a narrow grid cell used to
	// scroll sideways (643px of columns in a 534px widget on the pipelinq pages).
	// The list widget now fits its columns to the card once they do not fit.
	test('the table fits the card: no sideways scroll, the last column stays in view', async ({ page }) => {
		await page.route('**/apps/openregister/api/objects/r/s**', (route) => route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				total: 2,
				results: [
					{ id: 'a', name: 'Gemeente Zuiddrecht, afdeling Burgerzaken', email: 'burgerzaken@zuiddrecht.example.nl', organisation: 'Gemeente Zuiddrecht', updated: '2026-10-11' },
					{ id: 'b', name: 'Stichting Buurthuis Oost', email: 'info@buurthuisoost.example.nl', organisation: 'Stichting Buurthuis Oost', updated: '2026-10-09' },
				],
			}),
		}))
		await page.goto('/?narrowtable=1&list=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
		const tile = page.locator('[data-testid="narrow-list-widget"]')
		await tile.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 60_000 })
		// Four wide columns do not fit even with one column cut: the last step is a fixed layout.
		await expect(tile.locator('table.cn-data-table--fixed')).toHaveCount(1)
		const m = await tile.evaluate((el) => {
			const container = el.querySelector('.cn-data-table__scroll')
			const tileBox = el.getBoundingClientRect()
			const lastCell = el.querySelector('tbody tr td:last-of-type')
			return {
				scrollsSideways: container.scrollWidth > container.clientWidth + 1,
				lastRight: lastCell.getBoundingClientRect().right,
				tileRight: tileBox.right,
			}
		})
		expect(m.scrollsSideways).toBe(false)
		expect(m.lastRight).toBeLessThanOrEqual(m.tileRight)
	})
})
