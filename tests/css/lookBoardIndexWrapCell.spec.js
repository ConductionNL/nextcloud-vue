/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board index column that opts into wrapping (`cellClass: "cn-cell--wrap"`)
 * wraps its value over lines instead of cutting it with an ellipsis (DqTaken
 * task titles and subjects). jsdom draws no layout, so the rules are read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-index-wrap-cell/specs/data-table/spec.md#requirement-a-board-index-column-can-wrap-its-value
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const CELL = '.cn-look-board .cn-index-page__main--table .cn-table-container--board .cn-data-table td'

describe('look-board-index.css: a wrapping column', () => {
	it('cuts an ordinary cell to one line', () => {
		expect(bodyOf(`${CELL} > .cn-cell-renderer`)).toContain('white-space: nowrap;')
	})

	it('lets a cn-cell--wrap cell wrap its value', () => {
		const body = bodyOf(`${CELL}.cn-cell--wrap > .cn-cell-renderer`)
		expect(body).toContain('white-space: normal;')
		expect(body).toContain('overflow: visible;')
		expect(body).toContain('overflow-wrap: anywhere;')
	})
})
