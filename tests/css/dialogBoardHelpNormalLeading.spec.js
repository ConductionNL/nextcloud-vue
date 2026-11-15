/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog field's help line stands on the font's own leading, as every
 * dialog board draws it (PtUitnodigen, PtAccountUitgeven, DqZaakLocatie). At
 * 1.3 each help line stood 1.9px taller and the dialog's note card under the
 * invite fields 3.8px lower. jsdom draws no layout, so the rule is read from
 * the stylesheet.
 *
 * @spec openspec/changes/board-dialog-help-normal-leading/specs/board-dialog-help-normal-leading/spec.md#requirement-a-board-dialog-fields-help-line-stands-on-the-fonts-own-leading
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule that starts with this selector list.
 *
 * @param {string} head The selector list up to the brace.
 * @return {string} The declarations.
 */
function ruleOf(head) {
	const at = css.indexOf(head)
	expect(at).toBeGreaterThan(-1)
	const open = css.indexOf('{', at)
	return css.slice(open, css.indexOf('}', open))
}

describe('dialog.css: a board dialog field\'s help line', () => {
	it('stands on the font\'s own leading, for a text field and a text area', () => {
		const rule = ruleOf('.cn-dialog-board .dialog__content .input-field__helper-text-message,\n.cn-dialog-board .dialog__content .textarea__helper-text-message {')
		expect(rule).toContain('line-height: normal;')
		expect(rule).not.toMatch(/line-height: 1\.3;/)
	})

	it('keeps the 13px muted ink and the 4px step under the control', () => {
		const rule = ruleOf('.cn-dialog-board .dialog__content .input-field__helper-text-message,\n.cn-dialog-board .dialog__content .textarea__helper-text-message {')
		expect(rule).toContain('font-size: 13px;')
		expect(rule).toContain('padding: 4px 0 0;')
	})
})
