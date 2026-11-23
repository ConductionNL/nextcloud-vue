/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board matrix starts where the card header ends: its column heads carry
 * their own top padding (r36 DqProcesanalyse "Dagen per fase" gapBelowTitle
 * 40.9 vs 37). A bar list keeps the 4px start. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-matrix-under-header/specs/board-matrix-under-header/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const chart = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-chart-widget__html'

/**
 * The declarations of a rule.
 *
 * @param {string} selector The exact selector.
 * @return {string} Its body, or '' when there is no such rule.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: a matrix under the card header', () => {
	it('takes no top padding of its own', () => {
		expect(rule(chart + ':has(> .cn-chart-widget__matrix)')).toContain('padding-top: 0;')
	})

	it('leaves the 4px start of the other HTML charts', () => {
		expect(rule(chart)).toContain('padding: 4px var(--cn-board-dashboard-card-inset) 20px;')
	})
})
