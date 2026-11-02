/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a badge cell's list draws the small tags the boards draw
 * for a list in a table cell (PqServices "Geboekt op", PqBiExport "Dataset",
 * DqContacten "Geheimhouding"): 2px 8px, radius 10, 12px at 600, 18px tall,
 * 4px apart. Read from the stylesheet text.
 *
 * @spec openspec/changes/badge-list-labels-and-tags/specs/badge-cell-list/spec.md#requirement-a-badge-list-draws-the-boards-small-tags
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

describe('look-board-index.css: badge list tags', () => {
	it('draws each chip as the small board tag', () => {
		const rule = ruleEndingWith('.cn-look-board .cn-table-container--board .cn-data-table .cn-cell-renderer__badges .cn-status-badge')
		expect(rule).toContain('padding: 2px 8px;')
		expect(rule).toContain('border-radius: 10px;')
		expect(rule).toContain('font-size: 12px;')
		expect(rule).toContain('font-weight: 600;')
		expect(rule).toContain('line-height: normal;')
	})

	it('sets the chips 4px apart', () => {
		expect(ruleEndingWith('.cn-look-board .cn-cell-renderer__badges:not(.cn-look-nextcloud *)')).toContain('gap: 4px;')
	})
})
