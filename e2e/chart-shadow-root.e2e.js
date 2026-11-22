// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// CnChartWidget draws ApexCharts inside its canvas box's shadow root
// (?l7=chart-shadow-look, harness l7/ChartShadowLook.vue). Every ApexCharts
// redraw forces a style recalculation per label; in the light DOM each one
// also re-checked the page's `:has()` rules, which on a board-look dashboard
// cost seconds per filter step. These specs check that the chart really lives
// in the shadow root with its stylesheets there, and that its HTML chrome (the
// hover tooltip, the crosshair axis tooltip, the toolbar menu) still takes its
// colours from the Nextcloud tokens, and its text the theme's font, in the
// light, dark and NL Design System themes.
//
// WHY PLAYWRIGHT: apexcharts draws, and its stylesheet applies, only in a browser.

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

/**
 * Open the look fixture and wait until its four charts have drawn.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query Extra query string.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.setViewportSize({ width: 1100, height: 700 })
	await page.goto(`/?l7=chart-shadow-look${query}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('svg.apexcharts-svg')).toHaveCount(4, { timeout: 60_000 })
	await page.waitForTimeout(1_500)
}

/**
 * A custom property's value as the fixture root resolves it.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} name The property.
 * @return {Promise<string>} The value, as a computed colour.
 */
async function token(page, name) {
	return page.evaluate((prop) => {
		const probe = document.createElement('span')
		probe.style.color = `var(${prop})`
		document.querySelector('[data-testid="chart-shadow-look"]').appendChild(probe)
		const value = getComputedStyle(probe).color
		probe.remove()
		return value
	}, name)
}

test('every chart is drawn inside its canvas box shadow root, with its stylesheets there', async ({ page }) => {
	await open(page, '')
	const roots = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="chart-shadow-look"] .cn-chart-widget__canvas')).map((box) => ({
		shadow: box.shadowRoot !== null,
		svgInShadow: box.shadowRoot?.querySelector('.cn-chart-widget__chart svg.apexcharts-svg') !== null,
		svgInLight: box.querySelector('svg') !== null,
		apexCss: box.shadowRoot?.getElementById('apexcharts-css') !== null,
		chartRules: (box.shadowRoot?.adoptedStyleSheets?.length ?? 0) > 0 || box.shadowRoot?.querySelector('style[data-cn-chart]') !== null,
	})))
	expect(roots).toHaveLength(4)
	for (const root of roots) {
		expect(root).toEqual({ shadow: true, svgInShadow: true, svgInLight: false, apexCss: true, chartRules: true })
	}
	// ApexCharts put its stylesheet in each shadow root, not in the document.
	expect(await page.evaluate(() => document.getElementById('apexcharts-css'))).toBeNull()
})

for (const [theme, query] of [['light', ''], ['dark', '&dark=1'], ['NL Design System', '&nlds=1']]) {
	test(`the chart chrome takes the theme tokens (${theme})`, async ({ page }) => {
		await open(page, query)
		const background = await token(page, '--color-main-background')
		const text = await token(page, '--color-main-text')

		const bar = page.getByTestId('look-bar')
		await bar.locator('.apexcharts-bar-area').nth(3).hover()
		const tooltip = bar.locator('.apexcharts-tooltip.apexcharts-active')
		await expect(tooltip).toBeVisible()
		expect(await tooltip.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(background)
		expect(await tooltip.evaluate((el) => getComputedStyle(el).color)).toBe(text)

		const line = page.getByTestId('look-line')
		const grid = await line.locator('.apexcharts-grid').boundingBox()
		await page.mouse.move(grid.x + grid.width / 2, grid.y + grid.height / 2)
		const axisTooltip = line.locator('.apexcharts-xaxistooltip.apexcharts-active')
		await expect(axisTooltip).toBeVisible()
		expect(await axisTooltip.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(background)

		await page.mouse.move(0, 0)
		await bar.locator('.apexcharts-menu-icon').click()
		const menu = bar.locator('.apexcharts-menu.apexcharts-menu-open')
		await expect(menu).toBeVisible()
		expect(await menu.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(background)
	})
}

test('axis labels use the theme font handed down through the shadow boundary', async ({ page }) => {
	await open(page, '&nlds=1')
	const font = await page.getByTestId('look-bar').locator('.apexcharts-xaxis-label').first().evaluate((el) => getComputedStyle(el).fontFamily)
	expect(font).toContain('Georgia')
})
