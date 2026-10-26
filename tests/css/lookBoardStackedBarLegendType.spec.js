/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board stacked bar's legend is set in the board's type: label 14px, count
 * 22px, both at the normal line height (DqMijnWerk, a 46px item). Read from
 * the stylesheet.
 *
 * @spec openspec/changes/board-stacked-bar-legend-type/specs/board-stacked-bar-legend-type/spec.md#requirement-a-board-stacked-bar-legend-is-set-in-the-boards-type
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const P = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-stacked-bar:not(.cn-stacked-bar--compact)'

/**
 * The rule written exactly with this selector, from the selector to its closing brace.
 *
 * @param {string} sel The selector.
 * @return {string} The rule, or '' when there is none.
 */
function body(sel) {
	const at = css.indexOf(`${sel} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board: stacked bar legend type', () => {
	it('sets the label 14px and the count 22px at the normal line height', () => {
		expect(body(`${P} .cn-stacked-bar__label`)).toMatch(/font-size: 14px;\s*line-height: normal/)
		expect(body(`${P} .cn-stacked-bar__count`)).toMatch(/font-size: 22px;\s*line-height: normal/)
	})
})
