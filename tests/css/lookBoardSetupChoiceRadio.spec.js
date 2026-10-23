/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The setup wizard's choice cards draw their radio 20px in the primary colour
 * (DqInstellen "Voorbeeldgegevens laden", "Leeg beginnen"); the browser draws
 * 13px and Nextcloud's input height stretched it to 13x36. jsdom draws no
 * layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-setup-choice-radio/specs/board-setup-choice-radio/spec.md#requirement-a-setup-steps-choice-radio-is-20px
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

describe('look-board.css: setup step choice radio', () => {
	it('draws it 20px square in the primary colour', () => {
		const body = ruleFor('.cn-look-board .cn-setup-step .cn-choice-cards input.cn-choice-cards__row-input:not(.cn-look-nextcloud *)')
		expect(body).not.toBeNull()
		for (const decl of ['width: 20px;', 'min-width: 20px;', 'height: 20px;', 'min-height: 20px;', 'accent-color: var(--color-primary-element);']) {
			expect(body).toContain(decl)
		}
	})
})
