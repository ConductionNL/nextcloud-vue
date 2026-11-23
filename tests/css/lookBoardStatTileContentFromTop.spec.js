/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqProcesanalyse: in a row of same-height tiles a stacked board tile without a
 * caption keeps its label on the tile's top inset, as the boards draw every
 * tile, instead of centring it in the taller cell (r44: insetTop 29.5 vs 19 on
 * the board's 18px inset). jsdom draws no layout, so the rule is read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-stat-tile-content-from-top/specs/kpi-card/spec.md#requirement-a-board-stat-tile-holds-its-content-at-the-top
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: stat tile content from the top', () => {
	it('starts a stacked board tile at its top inset', () => {
		expect(rule('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-kpi-card--board.cn-kpi-card--stacked')).toContain('justify-content: flex-start;')
	})
})
