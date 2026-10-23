/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a labelled button in a card's title row 34px (DqZaaktype
 * "Taak toevoegen", "Bewerken"; DqZaaktypeOverzicht "Regel toevoegen";
 * DqCatalogus "Objecttype toevoegen"; COMPDIFF r24 h 34>40). The rule keeps
 * it there against the board's 40px controls elsewhere. Menu triggers and
 * icon-only buttons keep their own size. jsdom draws no layout, so the rule
 * is read from the stylesheet text.
 *
 * @spec openspec/changes/board-card-header-button-height/specs/board-card-header-button-height/spec.md#requirement-a-labelled-card-header-button-is-34px
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

describe('look-board.css: card header button height', () => {
	it('draws a labelled card header button 34px', () => {
		const body = ruleFor('.cn-look-board .cn-widget-wrapper__actions .button-vue:not(.action-item__menutoggle):has(> .button-vue__wrapper > .button-vue__text:not(:empty)):where(:not(.cn-look-nextcloud *))')
		expect(body).not.toBeNull()
		expect(body).toContain('--button-size: 34px;')
		expect(body).not.toContain('--cn-board-control-height')
	})
})
