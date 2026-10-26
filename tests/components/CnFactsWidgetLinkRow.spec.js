/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts link is one row, the icon 10px before its label (DqZaakBesluiten
 * "Werkinstructie"), and a side card that opens on it starts the row 10px
 * under the title. The icon font's flex spans broke an inline link's line.
 */
import fs from 'fs'
import path from 'path'

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} file The file under src.
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(file, selector) {
	const css = fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const at = css.indexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('the facts link row', () => {
	it('draws the link as one row, the icon 10px before the label', () => {
		const link = rule('components/CnFactsWidget/CnFactsWidget.vue', '.cn-facts-widget__link')
		expect(link).toContain('display: inline-flex')
		expect(link).toContain('gap: 10px')
	})

	it('starts a side card that opens on its link 10px under the title', () => {
		expect(rule('css/look-board-detail.css', '.cn-look-board .cn-detail-page__side .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__link:first-child)')).toContain('padding-top: 10px')
	})
})
