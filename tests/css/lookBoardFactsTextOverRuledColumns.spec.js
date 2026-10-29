/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqSociaalDomein "De melding": running text over ruled three-column facts
 * is drawn as a 14px column, the text 14px under the title and the facts
 * 14px under the text. Running text over chips (DqZaak "Het verzoek") keeps
 * its 12px start.
 *
 * @spec openspec/changes/board-facts-text-over-ruled-columns/specs/board-facts-text-over-ruled-columns/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule whose selector list holds the given selector.
 *
 * @param {string} selector One selector of the list.
 * @return {string} The rule bodies joined, or ''.
 */
function rulesHolding(selector) {
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]', 'g')
	let out = ''
	let m
	while ((m = re.exec(css)) !== null) {
		const open = css.indexOf('{', m.index)
		out += css.slice(open, css.indexOf('}', open))
	}
	return out
}

describe('look-board-detail.css: running text over ruled columns', () => {
	it('keeps running text 12px under the title (control)', () => {
		expect(rulesHolding('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__text:first-child):not(.cn-detail-page__side *)')).toMatch(/padding-top: 12px;/)
	})

	it('starts text over ruled three-column facts 14px under the title', () => {
		expect(rulesHolding('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__text:first-child + .cn-facts-widget__rows--three):not(.cn-detail-page__side *)')).toMatch(/padding-top: 14px;/)
	})

	it('sets the ruled facts 14px under the text', () => {
		expect(rulesHolding('.cn-look-board .cn-detail-page .cn-facts-widget:has(> .cn-facts-widget__text:first-child + .cn-facts-widget__rows--three):not(.cn-detail-page__side *)')).toMatch(/gap: 14px;/)
	})
})
