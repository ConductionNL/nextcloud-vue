/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog's checkbox is the boards' native box (DqZaakSamenwerken,
 * r32). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dialog-checkbox-native-box/specs/dialog/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const box = '.cn-dialog-board .dialog__content .checkbox-radio-switch-checkbox:not(.checkbox-radio-switch--button-variant) .checkbox-content__icon'

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('dialog.css: the board dialog checkbox', () => {
	it('is an 18px box', () => {
		expect(rule(box)).toContain('width: 18px')
		expect(rule(box)).toContain('height: 18px')
	})

	it('hides the glyph', () => {
		expect(rule(box + ' svg')).toContain('visibility: hidden')
	})

	it('draws a grey edge while open', () => {
		expect(rule(box + '::before')).toContain('border: 1px solid var(--color-border-maxcontrast)')
		expect(rule(box + '::before')).toContain('border-radius: 2px')
	})

	it('fills in the primary colour once checked', () => {
		const checked = '.cn-dialog-board .dialog__content .checkbox-radio-switch-checkbox.checkbox-radio-switch--checked:not(.checkbox-radio-switch--button-variant) .checkbox-content__icon::before'
		expect(rule(checked)).toContain('background: var(--color-primary-element)')
	})
})
