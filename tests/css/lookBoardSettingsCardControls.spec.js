/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a settings card's fields, save buttons and version card
 * buttons are 40px (DqInstellingenAlgemeen, DqBeheerinstellingen). jsdom
 * draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-settings-card-controls/specs/board-settings-card-controls/spec.md#requirement-a-board-settings-cards-fields-and-save-buttons-are-40px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const SECTION = '.cn-look-board .settings-section:not(.cn-look-nextcloud *)'

describe('look-board.css: a settings card\'s controls are 40px', () => {
	it('draws a text field at the field height, its wrapper with the focus ring', () => {
		expect(bodyOf(`${SECTION} .input-field__input`)).toContain('height: var(--cn-field-height, 40px);')
		expect(bodyOf(`${SECTION} .input-field__main-wrapper`)).toContain('height: calc(var(--cn-field-height, 40px) + 2 * var(--border-width-input-focused, 2px));')
	})

	it.each([
		'.cn-look-board .cn-settings-section__save:not(.cn-look-nextcloud *) .button-vue',
		'.cn-look-board .cn-version-info--board:not(.cn-look-nextcloud *) .cn-version-info__footer-row .button-vue',
	])('draws %s 40px at 14px', (selector) => {
		const body = bodyOf(selector)
		expect(body).toContain('height: var(--cn-field-height, 40px);')
		expect(body).toContain('font-size: 14px;')
	})

	it('draws the compact version card title at 17px unless the app names its board\'s size', () => {
		expect(bodyOf(`${SECTION}:has(.cn-version-info--compact) > .settings-section__name`)).toContain('font-size: var(--cn-board-version-title-size, 17px);')
	})
})
