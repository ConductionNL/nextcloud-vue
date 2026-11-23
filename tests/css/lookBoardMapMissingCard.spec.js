/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look draws the map view's "zaken zonder adres" card (DqZakenKaart)
 * as the board does: a 15px title at its normal line height, then "Toon ze in
 * de tabel" as a link flush with the title, 14px weight 600, not a 34px button
 * with its own padding.
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

const CARD = '.cn-look-board .cn-index-page__map-missing:not(.cn-look-nextcloud *)'

describe('look-board-index.css: the map view\'s missing-address card', () => {
	it('sets the title at 15px on its normal line height', () => {
		const body = rule(`${CARD} > strong`)
		expect(body).toContain('font-size: 15px')
		expect(body).toContain('line-height: normal')
	})

	it('draws the table link flush with the title, 14px 600, no button box', () => {
		const body = rule(`${CARD} > .button-vue`)
		expect(body).toContain('min-height: 0')
		expect(body).toContain('padding: 0')
		expect(body).toContain('border-width: 0')
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('font-weight: 600')
	})
})
