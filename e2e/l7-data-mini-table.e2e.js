// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A data card's list-of-objects table fits its value column
// (?l7=data-mini-table, harness l7/DataMiniTable.vue). On pipelinq's ticket
// page a nowrap inherited from the surface made the messages table (message +
// createdAt) 766px wide in a 212px value cell, and the card overflowed by 8px.
//
// WHY PLAYWRIGHT: widths and overflow are layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the messages table wraps inside its value cell and the card does not overflow', async ({ page }) => {
	await page.goto('/?l7=data-mini-table', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="data-mini-table"]')
	const table = host.locator('.cn-object-data-widget__mini-table')
	await table.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(table).toContainText('2026-10-05T07:37:08.269Z')
	const info = await host.evaluate((el) => {
		const wrap = el.querySelector('.cn-object-data-widget__mini-table-wrap')
		const tableBox = el.querySelector('.cn-object-data-widget__mini-table').getBoundingClientRect()
		const hostBox = el.getBoundingClientRect()
		const scrollers = [...el.querySelectorAll('*')].filter((node) => node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflowX !== 'visible').length
		return { tableRight: tableBox.right, wrapRight: wrap.getBoundingClientRect().right, hostRight: hostBox.right, hostOverflow: el.scrollWidth - el.clientWidth, scrollers }
	})
	expect(info.tableRight).toBeLessThanOrEqual(info.wrapRight + 1)
	expect(info.tableRight).toBeLessThanOrEqual(info.hostRight + 1)
	expect(info.hostOverflow).toBeLessThanOrEqual(1)
	expect(info.scrollers).toBe(0)
})
