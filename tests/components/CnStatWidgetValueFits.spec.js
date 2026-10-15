/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidget.fitValue: a number wider than its row steps its font down by
 * the share that overflows, never under 14px (where it may wrap), and a
 * number that fits, or a text value, keeps its own size. jsdom lays nothing
 * out, so the row and value widths are given; the browser run is
 * e2e/l15-stat-value-fits.e2e.js.
 *
 * @spec openspec/changes/stat-value-fits/specs/stat-tile-board-look/spec.md#requirement-a-stat-value-shrinks-instead-of-clipping
 */
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

/**
 * @param {object} sizes `{ rowScroll, rowClient, valueWidth }` in px.
 * @param {string} [className] An extra class on the value.
 * @return {object} A context for `fitValue`.
 */
function context({ rowScroll, rowClient, valueWidth }, className = '') {
	const value = document.createElement('span')
	value.className = `cn-kpi-card__value ${className}`.trim()
	value.style.fontSize = '28px'
	document.body.appendChild(value)
	Object.defineProperty(value, 'offsetWidth', { get: () => valueWidth })
	// The stylesheet's size: fitValue clears the inline size to read it.
	const style = document.createElement('style')
	style.textContent = '.cn-kpi-card__value { font-size: 28px; }'
	document.head.appendChild(style)
	return { $refs: { valueRow: { scrollWidth: rowScroll, clientWidth: rowClient }, value }, fitFontSize: 99 }
}

function fit(ctx) {
	CnStatWidget.methods.fitValue.call(ctx)
	return ctx.fitFontSize
}

describe('CnStatWidget fitValue', () => {
	it('scales an overflowing number down by the share that overflows', () => {
		// 170px of number in a 122px row: 28 * 122 / 170 = 20.09…
		expect(fit(context({ rowScroll: 170, rowClient: 122, valueWidth: 170 }))).toBe(20)
	})

	it('never goes under 14px', () => {
		expect(fit(context({ rowScroll: 600, rowClient: 100, valueWidth: 600 }))).toBe(14)
	})

	it('leaves a number that fits at its own size', () => {
		expect(fit(context({ rowScroll: 122, rowClient: 122, valueWidth: 30 }))).toBeNull()
	})

	it('leaves a text value to its own wrap and clamp', () => {
		expect(fit(context({ rowScroll: 300, rowClient: 122, valueWidth: 300 }, 'cn-kpi-card__value--text'))).toBeNull()
	})

	it('wraps only at the smallest size', () => {
		const style = (fitFontSize) => CnStatWidget.computed.valueStyle.call({ fitFontSize, variantColor: '', content: {} })
		expect(style(20)).toEqual({ fontSize: '20px' })
		expect(style(14)).toEqual({ fontSize: '14px', whiteSpace: 'normal', overflowWrap: 'anywhere' })
		expect(style(null)).toEqual({})
	})
})
