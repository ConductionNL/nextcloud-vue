// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The DqTermijnen header and KPI row under the board look
// (?l8=termijnen-board, harness l8/TermijnenBoard.vue).
//
// Header: the actions stay on the title's row and the description with its
// segmented period runs under both at the header's full width. At 860px the
// actions used to drop to a line of their own under the description.
//
// KPI row: a stacked board stat tile sits 18px 20px inside its card, as the
// board draws it. The card-fit cell's own 8px 14px came on top, so the label
// sat 29px from the tile's top and 37px from its side.
//
// WHY PLAYWRIGHT: the claims are rendered positions.
//
// @spec openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-the-board-dashboard-header-keeps-its-actions-on-the-title-row
// @spec openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-a-board-kpi-row-tile-has-the-boards-inset

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

/**
 * Open the scenario at a width and measure the header and the first tile.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {number} width The page container width.
 * @return {Promise<object>} The boxes.
 */
async function measure(page, width) {
	await page.setViewportSize({ width: width + 100, height: 900 })
	await page.goto(`/?l8=termijnen-board&w=${width}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="cn-dashboard-page-kpi-t1"] .cn-kpi-card__title-text').waitFor({ state: 'visible', timeout: 60_000 })
	return page.evaluate(() => {
		const box = (el) => {
			const r = el.getBoundingClientRect()
			return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width }
		}
		const cell = document.querySelector('[data-testid="cn-dashboard-page-kpi-t1"]')
		return {
			header: box(document.querySelector('[data-testid="cn-dashboard-page-header"]')),
			title: box(document.querySelector('.cn-dashboard-page__title')),
			actions: box(document.querySelector('.cn-dashboard-page__header-actions')),
			description: box(document.querySelector('[data-testid="cn-dashboard-page-subtitle"]')),
			descriptionText: box(document.querySelector('[data-testid="cn-dashboard-page-subtitle"] > span')),
			period: box(document.querySelector('[data-testid="cn-dashboard-page-date-segmented"]')),
			tile: box(cell.querySelector('.cn-widget-wrapper')),
			label: box(cell.querySelector('.cn-kpi-card__title-text')),
		}
	})
}

for (const width of [860, 1180]) {
	test(`the header keeps its actions on the title row at ${width}px`, async ({ page }) => {
		const m = await measure(page, width)
		expect(Math.abs(m.actions.top - m.title.top)).toBeLessThanOrEqual(8)
		expect(m.description.top).toBeGreaterThanOrEqual(m.title.bottom)
		expect(m.description.top).toBeGreaterThanOrEqual(m.actions.bottom - 1)
		// The description spans the header, under the actions too.
		expect(Math.round(m.description.width)).toBe(Math.round(m.header.width))
		// The period group stays on the description's line.
		expect(m.period.top).toBeLessThan(m.descriptionText.bottom)
	})

	test(`a KPI row tile has the board's inset at ${width}px`, async ({ page }) => {
		const m = await measure(page, width)
		expect(m.label.top - m.tile.top).toBeLessThanOrEqual(24)
		expect(m.label.left - m.tile.left).toBeLessThanOrEqual(24)
		expect(m.label.left - m.tile.left).toBeGreaterThanOrEqual(18)
	})
}
