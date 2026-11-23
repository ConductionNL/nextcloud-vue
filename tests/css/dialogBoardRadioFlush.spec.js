/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A radio in a board dialog sits flush with the fields and is the 24px row the
 * boards draw, as a checkbox does (PqAanvraagOmzetten "Klant" and
 * "Contactpersoon": the radio sat 7px in and the row was 34px). Read from the
 * stylesheet.
 *
 * @spec openspec/changes/board-dialog-radio-flush/specs/board-dialog-radio-flush/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('src/css/dialog.css: radios in a board dialog', () => {
	it('sets the radio flush with the fields, its label 10px after it', () => {
		const body = bodyOf('.cn-dialog-board .checkbox-radio-switch-radio:not(.checkbox-radio-switch--button-variant) .checkbox-content')
		expect(body).toMatch(/padding-inline:\s*0/)
		expect(body).toMatch(/gap:\s*10px/)
	})

	it('draws the radio row 24px high', () => {
		expect(bodyOf('.cn-dialog-board .dialog__content .checkbox-radio-switch-radio:not(.checkbox-radio-switch--button-variant) .checkbox-content')).toMatch(/min-height:\s*24px/)
		expect(bodyOf('.cn-dialog-board .dialog__content .checkbox-radio-switch-radio:not(.checkbox-radio-switch--button-variant) .checkbox-radio-switch__input')).toMatch(/min-height:\s*24px/)
	})
})
