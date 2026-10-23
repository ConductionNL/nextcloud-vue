/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a macros row reads as the boards draw a list row: the
 * name at weight 500 over a 13px line, both at the normal line height, so a
 * row is 56px (DqZaakAssistent "Macro's": live 65px at weight 600). Read
 * from the stylesheet text.
 *
 * @spec openspec/changes/board-macros-rows/specs/board-macros-rows/spec.md#requirement-a-board-macros-row-is-a-board-list-row
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or ''.
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

describe('look-board.css: a macros row', () => {
	it('sets the name at 500, normal line height', () => {
		const body = bodyOf('.cn-look-board .cn-macros-widget__row:not(.cn-look-nextcloud *) .cn-macros-widget__name')
		expect(body).toContain('font-weight: 500;')
		expect(body).toContain('line-height: normal;')
	})

	it('sets the line under it at the normal line height', () => {
		expect(bodyOf('.cn-look-board .cn-macros-widget__row:not(.cn-look-nextcloud *) .cn-macros-widget__hint')).toContain('line-height: normal;')
	})
})
