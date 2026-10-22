/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The user settings dialog's section buttons are drawn text-only at the 40px
 * control height, 16px in (DqPersoonlijkeInstellingen "Waarneming
 * registreren", "Inloggegevens toevoegen", "Opnieuw beginnen"). NcButton drew
 * 34px with an icon. jsdom draws no layout, so the rules are read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-user-settings-section-buttons/specs/board-user-settings-section-buttons/spec.md#requirement-a-user-settings-section-button-is-a-40px-text-button
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

const BUTTON = '.cn-look-board.cn-user-settings-dialog .app-settings-section__content .button-vue:has(> .button-vue__wrapper > .button-vue__text:not(:empty))'

describe('dialog.css: user settings section buttons', () => {
	it('draws a labelled button at the control height, 16px in', () => {
		const body = ruleFor(BUTTON)
		expect(body).not.toBeNull()
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
		expect(body).toContain('--button-padding: 16px;')
	})

	it('draws it text-only', () => {
		expect(ruleFor(`${BUTTON} .button-vue__icon`)).toContain('display: none;')
		expect(ruleFor(`${BUTTON} .button-vue__text.button-vue__text`)).toContain('padding-inline: 0;')
	})
})
