/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look draws a settings card's description as the title's subtitle
 * (DqVthInstellingen "Legesregels", "Activiteiten uit het Omgevingsloket"):
 * 14px muted, also under a theme that sets paragraphs with `!important`, and
 * when the card has actions it stays under the title beside them instead of
 * dropping under the buttons.
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: settings card subtitle', () => {
	it('hands the theme the subtitle size, leading and muted ink', () => {
		const body = rule('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .settings-section__desc')
		expect(body).toContain('--nldesign-component-paragraph-font-size: 14px')
		expect(body).toContain('--nldesign-component-paragraph-line-height: 1.5')
		expect(body).toContain('--nldesign-component-paragraph-color: var(--color-text-maxcontrast)')
	})

	it('keeps the subtitle under the title, in the title column, when the card has actions', () => {
		const body = rule('.cn-look-board .settings-section:not(.cn-look-nextcloud *):has(> .cn-settings-section__actions) > .settings-section__desc')
		expect(body).toContain('grid-row: 2')
		expect(body).toContain('grid-column: 1')
	})

	it('centres the actions on the title and subtitle together', () => {
		const body = rule('.cn-look-board .settings-section:not(.cn-look-nextcloud *):has(> .settings-section__desc) > .cn-settings-section__actions')
		expect(body).toContain('grid-row: 1 / span 2')
		expect(body).toContain('align-self: center')
	})
})
