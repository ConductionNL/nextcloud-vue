/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog's chosen option shows its fields 12px under its description,
 * the labels on the normal line (DqVolgendeStap "Opschorten", r31: 11.6px low).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-choice-card-fields-under-the-text/specs/dialog/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const C = '.cn-dialog-board .cn-choice-cards .cn-choice-cards__cell--with-details'

describe('dialog.css: the chosen option\'s fields', () => {
	it('sit 12px under the option text, the row adding no bottom padding', () => {
		expect(rule(C)).toContain('gap: 12px')
		expect(rule(C + ' .cn-choice-cards__row')).toContain('padding-bottom: 0')
	})

	it('label on the normal line', () => {
		expect(rule('.cn-dialog-board .cn-transition-input-fields .cn-transition-input-fields__label')).toContain('line-height: normal')
	})
})
