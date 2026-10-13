// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A chart's canvas fits its box (?l7=chart-box-fits, harness
// l7/ChartBoxFits.vue). On pipelinq's Rapportage three chart canvases were
// 4 to 7px taller inside than their box and scrolled: the inline SVG's line
// descender, in a box whose `overflow-x: hidden` made the other axis `auto`.
//
// WHY PLAYWRIGHT: apexcharts draws only in a browser, and overflow is layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('no chart canvas is a scroll region, and each drawn chart ends inside its box', async ({ page }) => {
	await page.goto('/?l7=chart-box-fits', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const canvases = page.locator('[data-testid="chart-box-fits"] .cn-chart-widget__canvas')
	await expect(canvases).toHaveCount(3, { timeout: 60_000 })
	await page.locator('[data-testid="chart-box-fits"] .apexcharts-canvas svg').nth(2).waitFor({ state: 'visible', timeout: 60_000 })
	const info = await canvases.evaluateAll((els) => els.map((el) => {
		const svg = el.querySelector('.apexcharts-canvas svg')
		const style = getComputedStyle(el)
		return { oy: style.overflowY, ox: style.overflowX, gutter: el.offsetWidth - el.clientWidth - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth), svgBottom: Math.round(svg.getBoundingClientRect().bottom), boxBottom: Math.round(el.getBoundingClientRect().bottom) }
	}))
	for (const canvas of info) {
		// Not a scroll region on either axis, so no scrollbar can appear (an
		// absolutely placed axis tooltip box may reach a few px past, clipped).
		expect(canvas.oy).toBe('hidden')
		expect(canvas.ox).toBe('hidden')
		expect(canvas.gutter).toBe(0)
		// The drawn chart itself ends inside its box.
		expect(canvas.svgBottom).toBeLessThanOrEqual(canvas.boxBottom + 1)
	}
})
