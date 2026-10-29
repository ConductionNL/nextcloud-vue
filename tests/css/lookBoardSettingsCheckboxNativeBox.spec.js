/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a checkbox in a settings section is the boards' native
 * 18px box with its label at 400, as a board dialog's is (PqBeheer Verkoop,
 * Kassa, Producten; the Dq boards draw every checkbox so). jsdom draws no
 * layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-settings-checkbox-native-box/specs/board-settings-checkbox-native-box/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies joined.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	let out = ''
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out += m[2]
		}
	}
	return out
}

const CHECKBOX = '.checkbox-radio-switch-checkbox:not(.checkbox-radio-switch--button-variant):not(.cn-look-nextcloud *)'

describe.each([
	'.cn-look-board .settings-section',
	'.cn-look-board .cn-settings-section',
])('the checkbox in %s', (section) => {
	const box = `${section} ${CHECKBOX} .checkbox-content__icon`

	it('is an 18px box with the glyph hidden', () => {
		expect(bodyOf(box)).toContain('width: 18px')
		expect(bodyOf(box)).toContain('height: 18px')
		expect(bodyOf(box + ' svg')).toContain('visibility: hidden')
	})

	it('draws a grey edge while open and fills once checked', () => {
		expect(bodyOf(box + '::before')).toContain('border: 1px solid var(--color-border-maxcontrast)')
		const checked = `${section} .checkbox-radio-switch-checkbox.checkbox-radio-switch--checked:not(.checkbox-radio-switch--button-variant):not(.cn-look-nextcloud *) .checkbox-content__icon::before`
		expect(bodyOf(checked)).toContain('background: var(--color-primary-element)')
	})

	it('sets its label at 400', () => {
		expect(bodyOf(`${section} ${CHECKBOX} .checkbox-content__text`)).toContain('font-weight: 400')
	})
})
