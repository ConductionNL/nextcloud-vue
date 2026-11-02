/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A destructive row action ("Uitnodiging intrekken", "Verwijderen") is drawn
 * in red. CnRowActions puts `cn-row-action--destructive` on the action's
 * <li>, while Nextcloud gives the button inside its own ink, so the colour
 * has to name the button. Under the board look the red is the error tag's
 * (#a30000, PtUitnodigingen, PtPortals). jsdom draws no layout, so the rules
 * are read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const strip = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

const MENU = 'body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .v-popper__popper.action-item__popper'

describe('destructive row action ink', () => {
	it('colours the button and the link inside the action, not only the list item', () => {
		const css = strip('context-menu.css')
		for (const inner of ['.action-button', '.action-link']) {
			expect(ruleFor(css, `.cn-row-action--destructive > ${inner}`)).toContain('color: var(--color-error) !important;')
		}
	})

	it('draws it in the error tag\'s red under the board look, as the saved view Delete', () => {
		const css = strip('look-board.css')
		for (const inner of ['.action-button', '.action-link']) {
			const body = ruleFor(css, `${MENU} li.action.cn-row-action--destructive > ${inner}`)
			expect(body).toContain('color: var(--nldesign-component-status-badge-error-color, var(--nl-color-red-text, var(--color-error-text))) !important;')
		}
	})
})
