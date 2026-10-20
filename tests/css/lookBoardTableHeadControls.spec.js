/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a table header's sort control as the bare label (square)
 * and its filter funnel as a 22px button with a 4px radius (DqZaken). The
 * table's own rule and Nextcloud's `button` rule gave both the 8px element
 * radius. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-table-head-controls/specs/board-table-head-controls/spec.md#requirement-board-table-header-controls-take-the-boards-shape
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with the given selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleEndingWith(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: table header controls', () => {
	it('draws the sort control square', () => {
		expect(ruleEndingWith('.cn-look-board .cn-table-container--board .cn-data-table th .cn-table-header__sort'))
			.toMatch(/border-radius: 0;/)
	})

	it('gives the filter funnel a 4px radius', () => {
		expect(ruleEndingWith('.cn-look-board .cn-table-container--board .cn-data-table th .cn-table-header__filter'))
			.toMatch(/border-radius: 4px;/)
	})
})
