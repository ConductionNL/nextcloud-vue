// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// How long an ApexCharts bar chart takes to show new data when a dashboard
// filter changes (?l7=chart-filter-update, harness l7/ChartFilterUpdate.vue).
// On launchpad's 50,000-object drill-down a click took 9.8 s (median) until the
// bars re-rendered, against a bound of 300 ms, while the HTML bar-list kind and
// the queries were fast: the cost was the chart drawing.
//
// Each step swaps in a new gemeente's 30 wijken and its status counts, and is
// timed in the page's own clock to the moment every wijk label shows the new
// gemeente, and to the last DOM change of the redraw. The page also counts how
// often ApexCharts redraws and measures SVG text, the work a cheap update must
// not repeat.
//
// WHY PLAYWRIGHT: apexcharts draws, and measures its labels, only in a browser.

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

const STEPS = 12
const BOUND_MS = 300

/**
 * Median and 95th percentile (nearest rank) of a list.
 *
 * @param {number[]} values The values.
 * @return {{median: number, p95: number, max: number}} The statistics.
 */
function stats(values) {
	const sorted = [...values].sort((a, b) => a - b)
	const round = (v) => Math.round(v * 10) / 10
	const mid = sorted.length % 2 === 1
		? sorted[(sorted.length - 1) / 2]
		: (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
	return { median: round(mid), p95: round(sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)]), max: round(sorted[sorted.length - 1]) }
}

/**
 * Open the fixture, wait for the first draw, and install the counters.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query Extra query string.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.addInitScript(() => {
		const counts = { bbox: 0, textLength: 0 }
		window.__chartCounts = counts
		const bbox = SVGGraphicsElement.prototype.getBBox
		SVGGraphicsElement.prototype.getBBox = function(...args) {
			counts.bbox++
			return bbox.apply(this, args)
		}
		const textLength = SVGTextContentElement.prototype.getComputedTextLength
		SVGTextContentElement.prototype.getComputedTextLength = function(...args) {
			counts.textLength++
			return textLength.apply(this, args)
		}
	})
	await page.goto(`/?l7=chart-filter-update${query}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const b = page.locator('[data-testid="chart-filter-b"] .apexcharts-bar-area')
	await expect(b).toHaveCount(30, { timeout: 60_000 })
	await page.waitForTimeout(1_500)
	await page.evaluate(() => {
		const proto = window.ApexCharts.prototype
		const calls = { render: 0, update: 0, destroy: 0, updateOptions: 0, updateSeries: 0 }
		window.__chartCalls = calls
		for (const name of Object.keys(calls)) {
			const original = proto[name]
			proto[name] = function(...args) {
				calls[name]++
				return original.apply(this, args)
			}
		}
		// ctx.update() runs on the instance's `ctx`, which is the instance.
	})
}

/**
 * Apply filter step `index` and time it.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {number} index The gemeente.
 * @return {Promise<{labels: number, settled: number}>} Milliseconds from the change.
 */
async function step(page, index) {
	return page.evaluate((i) => new Promise((resolve) => {
		const root = document.querySelector('[data-testid="chart-filter-update"]')
		const b = document.querySelector('[data-testid="chart-filter-b"]')
		const code = ['0300', '0307', '0314', '0321', '0328', '0335', '0342', '0349', '0356', '0363', '0370', '0377'][i % 12]
		let labelsAt = null
		let last = null
		let quietTimer = null
		const start = performance.now()
		const done = () => {
			observer.disconnect()
			resolve({ labels: labelsAt - start, settled: (last ?? labelsAt) - start })
		}
		const observer = new MutationObserver(() => {
			last = performance.now()
			if (labelsAt === null) {
				const labels = Array.from(b.querySelectorAll('.apexcharts-xaxis-label'))
					.map((node) => (node.querySelector('title')?.textContent ?? node.textContent ?? '').trim())
				if (labels.length === 30 && labels.every((text) => text.startsWith(`WK${code}`))) {
					labelsAt = last
				}
			}
			if (labelsAt !== null) {
				clearTimeout(quietTimer)
				quietTimer = setTimeout(done, 1_000)
			}
		})
		observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true })
		window.__chartFilter(i)
	}), index)
}

for (const [name, query] of [['default options', ''], ['animations off by the host', '&quiet=1'], ['on a page of 20,000 elements', '&quiet=1&heavy=2000']]) {
	test(`a filter change redraws the bar charts within ${BOUND_MS} ms (${name})`, async ({ page }, info) => {
		await open(page, query)
		const before = await page.evaluate(() => ({ ...window.__chartCounts }))
		const rows = []
		for (let i = 1; i <= STEPS; i++) {
			rows.push(await step(page, i))
		}
		const calls = await page.evaluate(() => window.__chartCalls)
		const after = await page.evaluate(() => window.__chartCounts)
		const result = {
			labels: stats(rows.map((row) => row.labels)),
			settled: stats(rows.map((row) => row.settled)),
			perStep: Object.fromEntries(Object.entries(calls).map(([k, v]) => [k, v / STEPS])),
			textMeasuresPerStep: { bbox: (after.bbox - before.bbox) / STEPS, textLength: (after.textLength - before.textLength) / STEPS },
		}
		const text = JSON.stringify(result, null, 2)
		console.log(`[chart-filter-update ${name}] ${text}`)
		await info.attach(`chart-filter-update ${name}`, { body: text, contentType: 'application/json' })
		// The instance is updated in place, never thrown away and rebuilt.
		expect(calls.destroy).toBe(0)
		expect(calls.render).toBe(0)
		expect(result.labels.median).toBeLessThan(BOUND_MS)
	})
}
