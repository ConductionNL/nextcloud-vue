/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look starts a card's body as far below its title as the boards
 * draw it, per kind of body. A side card that opens on a lead (DqZaak
 * "Aanvrager", DqOrganisatie "KvK en adres") draws the lead row 12px below the
 * title with its two lines at their normal height, centred on the 40px tile.
 * A body card whose facts open on the column grid (DqContact "Contact",
 * DqOrganisatie "Organisatie") is a data card: 14px, like the data grid.
 * A body card that opens on running text (DqZaak "Het verzoek") draws the
 * paragraph 12px below the title box, at line-height 1.6.
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-detail.css: card title gap per body kind', () => {
	it('starts a side card that opens on a lead 12px below its title', () => {
		expect(rule('.cn-look-board .cn-detail-page__side .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__lead:first-child)')).toContain('padding-top: 12px')
	})

	it('sets the lead lines in a side card at their normal height', () => {
		expect(rule('.cn-look-board .cn-detail-page__side .cn-facts-widget__lead-text')).toContain('line-height: normal')
	})

	it('starts a body card whose facts open on the column grid 14px below its title', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__rows--columns:first-child):not(.cn-detail-page__side *)'))
			.toContain('padding-top: calc(14px - var(--cn-board-first-line-leading))')
	})

	it('starts a body card that opens on running text 12px below its title, the text at 1.6', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__text:first-child):not(.cn-detail-page__side *)')).toContain('padding-top: 12px')
		expect(rule('.cn-look-board .cn-detail-page .cn-facts-widget__text:not(.cn-detail-page__side *)')).toContain('line-height: 1.6')
	})
})
