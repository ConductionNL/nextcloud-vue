/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A Nextcloud text field or text area in a board dialog is the board's field
 * (PlanItemDialog): the label above the control at 14px/600, the control 40px
 * with a 1px grey border and radius 8. NcInputField's 65%-transparent shadow
 * border read as an empty band on the white dialog. Read from the stylesheet
 * text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const content = '.cn-dialog-board .dialog__content'

describe('dialog.css: text fields in a board dialog', () => {
	it('moves a field\'s own label above the control, 14px/600, and makes room for it', () => {
		const label = rulesFor(`${content} .input-field__input + .input-field__label.input-field__label`)
		expect(label).toContain('inset-block-start: auto')
		expect(label).toContain('inset-block-end: calc(100% + 4px)')
		expect(label).toContain('font-weight: 600')
		expect(rulesFor(`${content} .input-field:has(.input-field__label)`)).toContain('margin-block-start: 26px')
	})

	it('draws the control 40px with a solid 1px grey border and radius 8, label outside or not', () => {
		expect(rulesFor(`${content} .input-field__main-wrapper`)).toContain('var(--cn-field-height, 40px)')
		const control = rulesFor(`${content} .input-field__input`)
		expect(control).toContain('box-shadow: 0 0 0 1px var(--color-border-dark)')
		expect(control).toContain('border-radius: 8px')
		expect(rulesFor(`${content} .textarea__input`)).toContain('box-shadow: 0 0 0 1px var(--color-border-dark)')
	})

	it('only reaches a board dialog', () => {
		const selectors = (css.match(/[^{}]*(input-field|textarea)[^{}]*\{/g) || []).flatMap((s) => s.replace('{', '').split(','))
		for (const s of selectors.map((x) => x.trim()).filter(Boolean)) {
			expect(s.startsWith('.cn-dialog-board ')).toBe(true)
		}
	})
})
