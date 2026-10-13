// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A chart's canvas fits its box (?l7=chart-canvas-fits, harness
// l7/ChartCanvasFits.vue). On pipelinq's Rapportage three chart canvases were
// 4 to 7px taller inside than their box and scrolled: the inline SVG's line
// descender, in a box whose `overflow-x: hidden` made the other axis `auto`.
//
// WHY PLAYWRIGHT: apexcharts draws only in a browser, and overflow is layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('no chart canvas is taller inside than its box, and none scrolls', async ({ page }) => {
	await page.goto('/?l7=chart-canvas-fits', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const canvases = page.locator('[data-testid="chart-canvas-fits"] .cn-chart-widget__canvas')
	await expect(canvases).toHaveCount(3, { timeout: 60_000 })
	await page.locator('[data-testid="chart-canvas-fits"] .apexcharts-canvas svg').nth(2).waitFor({ state: 'visible', timeout: 60_000 })
	const info = await canvases.evaluateAll((els) => els.map((el) => {
		const svg = el.querySelector('.apexcharts-canvas svg')
		return { inner: el.scrollHeight - el.clientHeight, oy: getComputedStyle(el).overflowY, svgBottom: Math.round(svg.getBoundingClientRect().bottom), boxBottom: Math.round(el.getBoundingClientRect().bottom) }
	}))
	for (const canvas of info) {
		expect(canvas.inner).toBeLessThanOrEqual(0)
		expect(canvas.oy).not.toBe('auto')
		expect(canvas.svgBottom).toBeLessThanOrEqual(canvas.boxBottom + 1)
	}
})
