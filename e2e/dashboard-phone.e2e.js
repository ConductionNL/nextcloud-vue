// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A board dashboard page at phone width (screens-dashboard-phone), measured in
// a browser: one column, no sideways scroll, and every touch target at least
// 44px. A desktop width is the control: the same page keeps two columns.
//
// WHY PLAYWRIGHT: stacking, widths and target sizes are layout, which jsdom
// does not compute.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const ROWS = [
	{ id: 'a', title: 'Afvalpas werkt niet', channel: 'web', client: { name: 'M. de Graaf' } },
	{ id: 'b', title: 'Lantaarnpaal kapot', channel: 'telefoon', client: { name: 'S. de Vries' } },
]

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {number} width The viewport width.
 * @return {Promise<object>} The measured geometry.
 */
async function measure(page, width) {
	await page.setViewportSize({ width, height: 900 })
	await page.route('**/apps/openregister/**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ value: 3, total: 2, results: ROWS }),
	}))
	await page.goto('/?l4=phone-board', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('.cn-record-list__row').first().waitFor({ state: 'visible', timeout: 60_000 })
	await page.locator('.cn-dashboard-page__kpi-cell').first().waitFor({ state: 'visible', timeout: 60_000 })
	return page.evaluate(() => {
		const rect = (el) => {
			const b = el.getBoundingClientRect()
			return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
		}
		const all = (selector) => [...document.querySelectorAll(selector)].map(rect)
		return {
			scrollWidth: document.documentElement.scrollWidth,
			chips: all('.cn-segmented-control__option'),
			toggle: all('.cn-workspace-filter-widget__toggle'),
			select: all('.cn-workspace-filter-widget .vs__dropdown-toggle'),
			kpi: all('.cn-dashboard-page__kpi-cell'),
			cells: all('.grid-stack-item'),
			rows: all('.cn-record-list__row'),
			actions: all('.cn-widget-wrapper__actions .button-vue'),
		}
	})
}

test('at 390px the page is one column, does not scroll sideways, and every touch target is at least 44px', async ({ page }) => {
	const m = await measure(page, 390)
	expect(m.scrollWidth).toBeLessThanOrEqual(390)
	// One column: every grid cell and every KPI tile starts at the same left edge.
	expect(new Set(m.cells.map((c) => c.x)).size).toBe(1)
	expect(new Set(m.kpi.map((c) => c.x)).size).toBe(1)
	m.cells.forEach((c) => expect(c.w).toBeGreaterThan(280))
	// Touch targets.
	expect(m.chips.length).toBeGreaterThanOrEqual(4)
	m.chips.forEach((r) => expect(r.h).toBeGreaterThanOrEqual(44))
	m.toggle.forEach((r) => expect(r.h).toBeGreaterThanOrEqual(44))
	m.select.forEach((r) => expect(r.h).toBeGreaterThanOrEqual(44))
	m.kpi.forEach((r) => expect(r.h).toBeGreaterThanOrEqual(44))
	m.rows.forEach((r) => expect(r.h).toBeGreaterThanOrEqual(44))
	m.actions.forEach((r) => expect(r.h).toBeGreaterThanOrEqual(44))
	// The chips wrap inside the bar instead of running off the screen.
	m.chips.forEach((r) => expect(r.x + r.w).toBeLessThanOrEqual(390))
})

test('at 1280px the same page keeps its two columns and 34px chips', async ({ page }) => {
	const m = await measure(page, 1280)
	const lists = m.cells.filter((c) => c.w < 1000)
	expect(lists).toHaveLength(2)
	expect(lists[0].x).not.toBe(lists[1].x)
	expect(lists[0].y).toBe(lists[1].y)
	m.chips.forEach((r) => expect(r.h).toBe(34))
})
