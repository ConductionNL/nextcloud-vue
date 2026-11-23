/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog field's help line is 13px muted under the control
 * (PtUitnodigen). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dialog-field-help/specs/board-dialog-field-help/spec.md#requirement-a-board-dialog-fields-help-line-is-13px-muted-under-the-control
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('dialog.css: field help in a board dialog', () => {
	it('draws the help line 13px, muted and flush under the control', () => {
		const at = css.indexOf('.cn-dialog-board .dialog__content .input-field__helper-text-message,')
		expect(at).toBeGreaterThan(-1)
		const open = css.indexOf('{', at)
		const rule = css.slice(open, css.indexOf('}', open))
		expect(css.slice(at, open)).toMatch(/\.textarea__helper-text-message/)
		expect(rule).toMatch(/padding: 4px 0 0;/)
		expect(rule).toMatch(/font-size: 13px;/)
		expect(rule).toMatch(/color: var\(--color-text-maxcontrast\) !important;/)
	})
})
