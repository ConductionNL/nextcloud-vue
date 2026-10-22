/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a native radio or checkbox at 18px in the primary colour
 * (DqVolgendeStap, DqBesluit, DqDocumentGenereren option cards); the browser
 * draws 13px, and Nextcloud's input height stretched it to 13x36. The
 * NcCheckboxRadioSwitch input, which is hidden behind its icon, is left
 * alone. jsdom draws no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-native-choice-size/specs/board-native-choice-size/spec.md#requirement-a-native-radio-or-checkbox-is-18px-in-the-board-look
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board.css: native radio and checkbox', () => {
	it('draws them 18px square in the primary colour, leaving the switch input alone', () => {
		const body = ruleFor('.cn-look-board input[type="radio"]:not(.checkbox-radio-switch__input):not(.cn-look-nextcloud *)')
		expect(body).not.toBeNull()
		expect(ruleFor('.cn-look-board input[type="checkbox"]:not(.checkbox-radio-switch__input):not(.cn-look-nextcloud *)')).toBe(body)
		expect(body).toContain('width: 18px;')
		expect(body).toContain('height: 18px;')
		expect(body).toContain('min-height: 18px;')
		expect(body).toContain('accent-color: var(--color-primary-element);')
	})

	// The boards draw the radio on the card's own ground. Nextcloud and the
	// theme paint a native radio's ground white, primary when checked and grey
	// when disabled (with !important), which a native radio does not draw
	// but the computed style reports (COMPDIFF r23 DqVolgendeStap, DqBesluit).
	it('lets the card show through, also when checked or disabled', () => {
		const body = ruleFor('.cn-look-board input[type="radio"]:not(.checkbox-radio-switch__input):not(.cn-look-nextcloud *)')
		expect(body).toContain('background-color: transparent !important;')
	})
})
