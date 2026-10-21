/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Buttons inside a card are sized component by component against their own
 * board, not by a rule for every button: the boards draw these 40px, where
 * Nextcloud's button is 34px. DqZaakTaken "Nieuwe taak" (16px in at both
 * sides), DqZaakDocumenten "Bestanden toevoegen" and DqZaakEmail "Leeg
 * concept" with "Concept openen uit sjabloon". A task row's "Afronden" stays
 * 34px (DqZaakTaken). jsdom draws no layout, so the rules are read from the
 * stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const SIZED = [
	'.cn-look-board .button-vue.cn-detail-widget-header-items__primary:not(.cn-look-nextcloud *)',
	'.cn-look-board .button-vue.cn-files-browser__upload:not(.cn-look-nextcloud *)',
	'.cn-look-board .cn-related-files__add-button:not(.cn-look-nextcloud *)',
	'.cn-look-board .cn-mail-tab__template-row .button-vue:not(.cn-look-nextcloud *)',
]

describe('look-board-detail.css: card buttons the boards draw at 40px', () => {
	it.each(SIZED)('%s is the board control height', (selector) => {
		const body = bodyOf(selector)
		expect(body).toContain('height: var(--cn-board-control-height);')
		expect(body).toContain('min-height: var(--cn-board-control-height);')
	})

	it('pads "Nieuwe taak" 16px in at both sides', () => {
		expect(bodyOf(SIZED[0])).toContain('--button-padding: 16px;')
	})

	it('names no rule for every button', () => {
		expect(bodyOf('.cn-look-board .button-vue:not(.cn-look-nextcloud *)')).not.toContain('height')
	})
})
