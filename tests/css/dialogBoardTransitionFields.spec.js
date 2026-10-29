/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqVolgendeStap "Opschorten": a board dialog's transition fields stack the
 * label, the control and their lines 6px apart on the normal line, without
 * NcInputField's 2px wrapper padding (r33: 280.5 against 274), and the
 * control is the board's 40px: the input fills its wrapper, which
 * look-board.css makes 44px (r34 probe: "Reden" 44), so the rule outranks it.
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const T = '.cn-dialog-board .cn-transition-input-fields'

/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('dialog.css: board transition fields', () => {
	it('drops the input wrapper padding', () => {
		const body = rule(T + ' .input-field:not(.v-select *):not(.cn-look-nextcloud *) .input-field__main-wrapper')
		expect(body).toContain('padding-block: 0')
		expect(body).toContain('height: var(--cn-field-height, 40px)')
		expect(body).not.toContain('height: auto')
	})

	it('sets the help and note lines on the normal line', () => {
		expect(rule(T + ' .input-field__helper-text-message,\n' + T + ' .cn-transition-input-fields__muted')).toContain('line-height: normal')
	})

	it('stacks a block field as a 6px column', () => {
		expect(rule(T + ' .cn-transition-input-fields__field')).toContain('gap: 6px')
	})
})
