/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The assign dialog's help lines sit on the normal line height, the team
 * search's 6px under the field (board DqOverdragen). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule that starts with a selector.
 *
 * @param {string} selector The selector text.
 * @return {string} The declarations.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	const open = css.indexOf('{', at)
	return css.slice(open, css.indexOf('}', open))
}

describe('dialog.css: the assign dialog help lines', () => {
	it('sets a help line, not a toggle note, on the normal line height', () => {
		expect(rule('.cn-dialog-board .cn-assign-dialog__hint:not(.cn-assign-dialog__toggle-note)')).toMatch(/line-height: normal;/)
	})

	it('pulls the team search\'s 2px ring room back, so its help line is 6px under the field', () => {
		expect(rule('.cn-dialog-board .dialog__content .cn-assign-dialog__field > .cn-search-select .v-select.select')).toMatch(/margin-block-end: -2px;/)
	})

	it('sets the note\'s text area on top of its line and pulls its ring room back, so its help line is 6px under it', () => {
		expect(rule('.cn-dialog-board .dialog__content .cn-assign-dialog__field .textarea__input')).toMatch(/vertical-align: top;/)
		expect(rule('.cn-dialog-board .dialog__content .cn-assign-dialog__field > .textarea')).toMatch(/margin-block-end: -2px;/)
	})
})
