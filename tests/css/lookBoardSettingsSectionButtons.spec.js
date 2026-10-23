/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a labelled button on an admin settings card 40px tall, a
 * text-only one 16px in at both sides (DqBeheerinstellingen "Opslaan",
 * "Verbinding testen"; PtBeheerinstellingen "Adres opslaan", "Herkomst
 * opslaan"). The look drew only the settings card's own save row at 40px;
 * buttons an app puts on the card stayed 34px, 12px in. jsdom draws no
 * layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-settings-section-buttons/specs/board-settings-section-buttons/spec.md#requirement-a-labelled-button-on-a-board-settings-card-is-40px
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

const S = '.cn-look-board .settings-section:not(.cn-look-nextcloud *)'
const LABELLED = ':has(> .button-vue__wrapper > .button-vue__text:not(:empty))'
const ICONLESS = ':not(:has(> .button-vue__wrapper > .button-vue__icon:not(:empty)))'

describe('look-board.css: buttons on a settings card', () => {
	it('draws a labelled button 40px tall', () => {
		expect(ruleFor(`${S} .button-vue.button-vue${LABELLED}:not(.cn-settings-section__actions *):not(.cn-settings-field__image-row *)`)).toContain('--button-size: var(--cn-field-height, 40px);')
	})

	it('pads a text-only button 16px at both sides', () => {
		expect(ruleFor(`${S} .button-vue.button-vue${LABELLED}${ICONLESS}`)).toContain('--button-padding: 16px;')
		expect(ruleFor(`${S} .button-vue${ICONLESS} .button-vue__text.button-vue__text`)).toContain('padding-inline: 0;')
	})
})
