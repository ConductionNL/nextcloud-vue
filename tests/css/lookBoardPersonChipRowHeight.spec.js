/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContacten: a grey person chip row with a second line is 66px. Read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-person-chip-row-height/specs/data-table/spec.md#requirement-a-board-person-chip-row-is-66px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const table = '.cn-look-board .cn-table-container--board .cn-data-table'
const text = '.cn-cell-renderer__avatar-initials--neutral + .cn-cell-renderer__avatar-text'

describe('look-board-index.css: person chip row', () => {
	it('pads the cell 14px above and under', () => {
		expect(rule(`${table} td:has(${text} .cn-cell-renderer__avatar-secondary)`)).toContain('padding-block: 14px;')
	})

	it('sets the name 2px above a 14px second line', () => {
		expect(rule(`${table} ${text}:has(.cn-cell-renderer__avatar-secondary)`)).toContain('gap: 2px;')
		expect(rule(`${table} ${text} .cn-cell-renderer__avatar-secondary`)).toContain('font-size: 14px;')
	})
})
