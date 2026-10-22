/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A labelled menu button ("Acties", "Meer") is 40px tall in the board look,
 * as the header buttons beside it: in a page header, a card header and a tab
 * strip (DqTenant, DqAfdelingen, DqZaaktype). The boards drew it 34 in some
 * places and 40 in others; 40 matches the other header buttons. An icon-only
 * menu (a row's "...") keeps its own size. jsdom draws no layout, so the rule
 * is read from the stylesheet text.
 *
 * @spec openspec/changes/board-labelled-menu-trigger-height/specs/board-labelled-menu-trigger-height/spec.md#requirement-a-labelled-board-menu-button-is-40px
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

describe('look-board.css: labelled menu buttons', () => {
	it('draws a labelled menu button 40px tall', () => {
		const body = ruleFor('.cn-look-board .action-item__menutoggle.button-vue:has(> .button-vue__wrapper > .button-vue__text:not(:empty)):where(:not(.cn-look-nextcloud *))')
		expect(body).not.toBeNull()
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
		expect(body).toContain('min-height: var(--cn-board-control-height);')
	})
})
