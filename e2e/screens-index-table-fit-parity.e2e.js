// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-index-table-fit-parity: at a 1440px viewport the board look's index
// table fits its card. On pipelinq PqTickets the auto layout made seven text
// columns 1503px wide in a 1118px card, so Wachtend, Behandelaar and the row
// menus sat past the card's right edge. Measured on the real CnIndexPage
// (ScreensIndexHarness.vue, ?screensindex=table&wide=1), with a control
// without the board look.
//
// @spec openspec/changes/screens-index-table-fit-parity/specs/index-table-fit/spec.md#requirement-the-board-index-table-fits-its-card

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<object>} The measured boxes.
 */
async function measure(page, query) {
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 120_000 })
	await expect(page.locator('.cn-data-table tbody tr').first()).toBeVisible({ timeout: 120_000 })
	return page.evaluate(() => {
		const table = document.querySelector('.cn-data-table')
		const card = table.closest('.cn-table-container')
		const box = (el) => {
			const r = el.getBoundingClientRect()
			return { left: r.left, right: r.right, width: r.width }
		}
		return {
			table: box(table),
			card: box(card),
			headers: [...table.querySelectorAll('thead th')].map((th) => ({ text: th.textContent.trim(), ...box(th) })),
			menus: [...table.querySelectorAll('tbody .cn-table-col--actions button')].map(box),
			filters: [...table.querySelectorAll('thead th')].map((th) => {
				const f = th.querySelector('.cn-table-header__filter')
				return f ? { th: box(th), filter: box(f) } : null
			}).filter(Boolean),
			cut: [...table.querySelectorAll('tbody td > .cn-cell-renderer')].some((el) => el.scrollWidth > el.clientWidth),
		}
	})
}

test.describe('the board index table fits its card', () => {
	test('at 1440px every column and every row menu is inside the card, long text cut', async ({ page }) => {
		const m = await measure(page, '?screensindex=table&wide=1&w=1176')
		expect(m.table.width).toBeLessThanOrEqual(m.card.width + 1)
		for (const th of m.headers) {
			expect(th.right).toBeLessThanOrEqual(m.card.right + 1)
		}
		expect(m.menus.length).toBeGreaterThan(0)
		for (const menu of m.menus) {
			expect(menu.right).toBeLessThanOrEqual(m.card.right + 1)
		}
		// The funnel stays inside its header, after a cut label.
		for (const { th, filter } of m.filters) {
			expect(filter.right).toBeLessThanOrEqual(th.right + 1)
		}
		// The first data column (Onderwerp on PqTickets) takes the larger share.
		const data = m.headers.slice(1, -1)
		expect(data[0].width).toBeGreaterThan(data[1].width)
		// A long value is cut, not wrapped or spilled.
		expect(m.cut).toBe(true)
	})

	test('without the board look the table keeps its auto layout (control)', async ({ page }) => {
		const m = await measure(page, '?screensindex=table&wide=1&w=1176&plain=1')
		const layout = await page.evaluate(() => getComputedStyle(document.querySelector('.cn-data-table')).tableLayout)
		expect(layout).toBe('auto')
		expect(m.table.width).toBeGreaterThan(m.card.width)
	})
})
