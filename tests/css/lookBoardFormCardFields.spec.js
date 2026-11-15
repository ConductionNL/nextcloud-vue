/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqKlant / PqOrganisatie "Contactmoment registreren": a form card outside the
 * settings opts into the board settings card's fields (label 14/600 above a
 * 40px field, text areas at 1.5) and 40px buttons with `cn-board-form`.
 * pl6 drew the labels floating inside 34px fields.
 *
 * @spec openspec/changes/board-form-card-fields/specs/board-form-card-fields/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8')
const scope = '.cn-look-board .cn-board-form:not(.cn-look-nextcloud *)'

describe('board form card fields', () => {
	it.each([
		' .input-field__input:not(.v-select *) + .input-field__label,',
		' .textarea__input + .textarea__label,',
		' .textarea__input,',
		' .input-field__input,',
		' .input-field:has(.input-field__label):not(.v-select *),',
		' .v-select.select:has(.input-field__label),',
	])('a cn-board-form takes the settings card rule%s', (rest) => {
		expect(css).toContain(scope + rest)
	})

	it('gives its labelled buttons 40px', () => {
		expect(css).toContain(scope + ' .button-vue.button-vue:has(> .button-vue__wrapper > .button-vue__text:not(:empty)):not(.cn-settings-section__actions *)')
	})

	it('shares each rule with the settings card', () => {
		expect(css).toContain(scope + ' .textarea__input,\n.cn-look-board .settings-section:not(.cn-look-nextcloud *) .textarea__input {')
	})
})
