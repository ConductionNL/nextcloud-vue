// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A titled custom widget fits its detail page grid cell
// (?l7=titled-grid-item, harness l7/TitledGridItem.vue). dossiq's case type
// cards overflowed their cell by 31px whatever the cell's height: the widget
// took 100% of the cell under its 31px heading.
//
// WHY PLAYWRIGHT: overflow is layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the heading and the widget share the cell, at two cell heights', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1200 })
	await page.goto('/?l7=titled-grid-item', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	for (const id of ['statuses', 'portal']) {
		const fill = page.locator(`[data-testid="fill-${id}"]`)
		await fill.waitFor({ state: 'visible', timeout: 60_000 })
		const info = await fill.evaluate((el) => {
			const cell = el.closest('.grid-stack-item-content')
			const item = el.closest('.cn-detail-page__grid-item')
			const title = item.querySelector('.cn-detail-page__widget-title').getBoundingClientRect()
			const box = el.getBoundingClientRect()
			const cellBox = cell.getBoundingClientRect()
			return { overflow: cell.scrollHeight - cell.clientHeight, fillBottom: Math.round(box.bottom), cellBottom: Math.round(cellBox.bottom), fillTop: box.top, titleBottom: title.bottom, fillHeight: Math.round(box.height), cellHeight: Math.round(cellBox.height) }
		})
		expect(info.overflow).toBeLessThanOrEqual(1)
		expect(info.fillBottom).toBeLessThanOrEqual(info.cellBottom)
		expect(info.fillTop).toBeGreaterThanOrEqual(info.titleBottom)
		// The widget still fills what the heading leaves.
		expect(info.fillHeight).toBeGreaterThan(info.cellHeight - 40)
	}
})
