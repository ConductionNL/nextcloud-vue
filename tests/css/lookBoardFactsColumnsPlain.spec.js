/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContact: two-column facts are plain label-over-value pairs in the board
 * look. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-facts-columns-plain/specs/board-facts-columns-plain/spec.md#requirement-board-two-column-facts-are-plain-label-over-value-pairs
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

const columns = '.cn-look-board .cn-facts-widget__rows--columns:not(.cn-look-nextcloud *)'

describe('look-board-detail.css: two-column facts', () => {
	it('draws no hairline under a fact, the label 2px above the value', () => {
		const row = rule(`${columns} .cn-facts-widget__row`)
		expect(row).toContain('gap: 2px;')
		expect(row).toContain('padding-bottom: 0;')
		expect(row).toContain('border-bottom: none;')
	})

	it('sets the value in regular weight', () => {
		expect(rule(`${columns} .cn-facts-widget__value.cn-facts-widget__value`)).toContain('font-weight: 400;')
	})
})
