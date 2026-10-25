/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board table's leading icon sits on a 32px tile, radius 8, toned by the
 * page. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-row-icon-tile/specs/data-table/spec.md#requirement-a-board-tables-leading-icon-sits-on-a-tile
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the last rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: row icon tile', () => {
	it('draws a 32px tile with radius 8', () => {
		const tile = rule('.cn-look-board .cn-data-table td.cn-table-col--icon .material-design-icon')
		expect(tile).toContain('width: 32px;')
		expect(tile).toContain('border-radius: 8px;')
	})

	it('tones the teal tile with the teal status colours', () => {
		expect(rule('.cn-look-board .cn-data-table td.cn-table-col--icon-teal .material-design-icon')).toContain('var(--cn-status-teal-bg)')
	})
})
