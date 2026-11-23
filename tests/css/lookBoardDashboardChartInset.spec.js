/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An ApexCharts plot on a board dashboard card keeps the card's inset, as an
 * HTML chart does (DqDoorlooptijd). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-chart-inset/specs/board-dashboard-chart-inset/spec.md#requirement-a-board-dashboard-plot-keeps-the-cards-inset
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const CARD = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless)'

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function ruleOf(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: board dashboard plots', () => {
	it('pads the plot\'s box with the card inset', () => {
		const body = ruleOf(`${CARD} .cn-chart-widget__canvas`)
		expect(body).toMatch(/box-sizing: border-box;/)
		expect(body).toMatch(/padding: 4px var\(--cn-board-dashboard-card-inset\) 20px;/)
	})

	it('hands the bottom inset to a footnote under the plot', () => {
		expect(ruleOf(`${CARD} .cn-chart-widget__canvas:has(+ .cn-chart-widget__footnote)`)).toMatch(/padding-bottom: 0;/)
		expect(ruleOf(`${CARD} .cn-chart-widget > .cn-chart-widget__footnote`)).toMatch(/padding: 0 var\(--cn-board-dashboard-card-inset\) 20px;/)
	})
})
