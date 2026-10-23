// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A `record-list` card on a board dashboard (PtDashboard "Open toegangsverzoeken"),
// measured in a browser: the rows are inset from the card edge, no text run is
// underlined even under a host rule that underlines every link by id, the rows
// are separated by a hairline, and the pill sits at the right.
//
// WHY PLAYWRIGHT: padding, underline and alignment are computed styles and a
// layout; jsdom resolves neither.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const REQUESTS = [
	{ id: 'r1', displayName: 'R. Mulder, namens Bakkerij De Basislijn BV', reason: 'Ik ben de boekhouder van dit bedrijf', state: 'pending', waiting: '6 dagen' },
	{ id: 'r2', displayName: 'L. Hendriks, namens J. Hendriks', reason: 'Ik regel de zaken van mijn vader', state: 'pending', waiting: '2 dagen' },
]

test('record-list rows on a dashboard card use the board row look', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/portaliq/portalAccessRequest**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ total: 2, results: REQUESTS }),
	}))
	await page.goto('/?ptlistcard=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const rows = page.locator('[data-testid="pt-host"] .cn-record-list__row')
	await rows.first().waitFor({ state: 'visible', timeout: 60_000 })
	await expect(rows).toHaveCount(2)

	const info = await page.evaluate(() => {
		const list = document.querySelector('[data-testid="pt-host"] .cn-record-list')
		const row = list.querySelector('.cn-record-list__row')
		const rowStyle = getComputedStyle(row)
		const underlined = [...list.querySelectorAll('.cn-record-list__row, .cn-record-list__row *')]
			.filter((el) => getComputedStyle(el).textDecorationLine.includes('underline')).length
		const item2 = list.querySelectorAll('.cn-record-list__item')[1]
		const aside = row.querySelector('.cn-record-list__aside').getBoundingClientRect()
		const rowBox = row.getBoundingClientRect()
		const title = getComputedStyle(row.querySelector('.cn-record-list__title'))
		return {
			listPadLeft: parseFloat(getComputedStyle(list).paddingLeft),
			rowPadTop: parseFloat(rowStyle.paddingTop),
			underlined,
			dividerWidth: parseFloat(getComputedStyle(item2).borderTopWidth),
			asideRightGap: Math.round(rowBox.right - aside.right),
			titleWeight: Number(title.fontWeight),
			titleSize: title.fontSize,
			titleColor: title.color,
			rowColor: rowStyle.color,
		}
	})

	expect(info.listPadLeft).toBeGreaterThanOrEqual(16)
	// 12px, as the Dq dashboards pad a dashboard row (fix/r23-board-dashboard-list-density:
	// where the boards differ, the dossiq boards win).
	expect(info.rowPadTop).toBe(12)
	expect(info.underlined).toBe(0)
	expect(info.dividerWidth).toBe(1)
	// The pill and the date sit at the right edge of the row (inside its 8px hover inset).
	expect(info.asideRightGap).toBeLessThanOrEqual(8)
	expect(info.titleWeight).toBe(600)
	expect(info.titleSize).toBe('15px')
	// Not the host's link blue.
	expect(info.titleColor).not.toBe('rgb(0, 102, 204)')

	// Hover gives the row a ground and still no underline.
	await rows.first().hover()
	const hover = await rows.first().evaluate((el) => ({
		bg: getComputedStyle(el).backgroundColor,
		underline: getComputedStyle(el.querySelector('.cn-record-list__title')).textDecorationLine,
	}))
	expect(hover.bg).not.toBe('rgba(0, 0, 0, 0)')
	expect(hover.underline).toBe('none')
})
