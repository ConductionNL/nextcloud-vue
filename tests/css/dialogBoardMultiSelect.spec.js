/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A multiple select in a board dialog is the board's 40px field with its 1px
 * edge (DqFilterDelen "Delen met"). NcSelect draws a 24px search box inside a
 * toggle edged by a ring; the search box now takes the height through the
 * select's clickable area and the edge the dialog gives every field, and the
 * toggle drops its ring. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dialog-multiselect-field/specs/board-dialog-multiselect-field/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector list.
 *
 * @param {string} selector The selector list.
 * @return {string|null} The body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? null : css.slice(at, css.indexOf('}', at))
}

describe('dialog.css: a multiple select in a board dialog', () => {
	it('makes its search box 40px through the clickable area', () => {
		expect(body('.modal-mask.cn-dialog-board .dialog__content .v-select.select.vs--multiple')).toContain('--default-clickable-area: calc(var(--cn-field-height, 40px) + 4px);')
	})

	it('drops the toggle\'s ring so the field\'s edge is the only one', () => {
		const rule = body('.modal-mask.cn-dialog-board .dialog__content .v-select.select.vs--multiple .vs__dropdown-toggle')
		expect(rule).toContain('padding: 0;')
		expect(rule).toContain('border: 0;')
		expect(rule).toContain('box-shadow: none;')
	})
})
