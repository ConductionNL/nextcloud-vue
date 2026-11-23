/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * ApexCharts' svg.js measures some elements by cloning them into a hidden SVG
 * it appends to the body. CnChartWidget moves that SVG into a shadow root of
 * its own, so a measurement no longer restyles the whole page.
 */

/**
 * The hidden SVG svg.js appends to the body to measure in.
 *
 * @return {SVGSVGElement} the element.
 */
function svgMeasurer() {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svg.style.cssText = 'opacity: 0; position: absolute; left: -100%; top: -100%; overflow: hidden'
	svg.setAttribute('focusable', 'false')
	svg.setAttribute('aria-hidden', 'true')
	return svg
}

/**
 * A fresh copy of the module, so each test starts on a page that never moved one.
 *
 * @return {Function} keepSvgMeasurerInShadow.
 */
function freshModule() {
	let keep
	jest.isolateModules(() => {
		keep = require('../../src/components/CnChartWidget/chartShadow.js').keepSvgMeasurerInShadow
	})
	return keep
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
	document.body.innerHTML = ''
})

describe('keepSvgMeasurerInShadow', () => {
	it('moves a measuring SVG svg.js adds later into the shadow root of a hidden host', async () => {
		freshModule()()
		const svg = svgMeasurer()
		document.body.appendChild(svg)
		await flush()

		const host = document.querySelector('[data-cn-chart-measurer]')
		expect(host).not.toBeNull()
		expect(host.getAttribute('aria-hidden')).toBe('true')
		expect(svg.parentNode).toBe(host.shadowRoot)
	})

	it('moves a measuring SVG that was already on the page', () => {
		const svg = svgMeasurer()
		document.body.appendChild(svg)
		freshModule()()

		expect(svg.parentNode).toBe(document.querySelector('[data-cn-chart-measurer]').shadowRoot)
	})

	it('leaves any other SVG on the body alone', async () => {
		freshModule()()
		const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		icon.setAttribute('aria-hidden', 'true')
		document.body.appendChild(icon)
		await flush()

		expect(icon.parentNode).toBe(document.body)
	})

	it('sets up one host however many charts call it', () => {
		const keep = freshModule()
		keep()
		keep()
		keep()

		expect(document.querySelectorAll('[data-cn-chart-measurer]')).toHaveLength(1)
	})
})
