/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The contact boards (DqContact, PqKlant): "Identiteit" opens on a lead and
 * lists rows at the rows rhythm (10px), "Bereikbaar via" draws its action
 * 34px with no margin, "Woonadres" keeps 8px from its text to its link, and
 * the contact-moment feed sets its lines on the
 * normal line with 4px between rows. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-contact-identity-and-feed-rhythm/specs/board-contact-identity-and-feed-rhythm/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const side = '.cn-look-board .cn-detail-page__side'
const NOT_NC = ':not(.cn-look-nextcloud *)'
const leadWithRows = ':has(> .cn-facts-widget__lead:first-child):has(> .cn-facts-widget__rows)'

describe('look-board-detail.css: contact identity and feed rhythm', () => {
	it('starts a side lead card with rows 10px under its title', () => {
		expect(rule(`${side} .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__lead:first-child):has(> .cn-facts-widget > .cn-facts-widget__rows)${NOT_NC}`)).toContain('padding-top: 10px;')
	})

	it('keeps 10px between the parts of a side lead card with rows', () => {
		expect(rule(`${side} .cn-facts-widget${leadWithRows}${NOT_NC}`)).toContain('gap: 10px;')
	})

	it('keeps 10px from an inline row to the next, its button without vertical margin', () => {
		expect(rule(`${side} .cn-facts-widget__row--inline${NOT_NC}`)).toContain('margin-bottom: 2px;')
		expect(rule(`${side} .cn-facts-widget__inline-button${NOT_NC}`)).toContain('margin-block: 0;')
	})

	it('keeps 8px between a side text and its link, the link without leading above', () => {
		expect(rule(`${side} .cn-facts-widget:has(> .cn-facts-widget__text + .cn-facts-widget__link)${NOT_NC}`)).toContain('gap: 8px;')
		expect(rule(`${side} .cn-facts-widget__text + .cn-facts-widget__link${NOT_NC}`)).toContain('margin-top: 0;')
	})

	it('draws a side facts action 34px tall without vertical margin', () => {
		const body = rule(`${side} .cn-facts-widget__action${NOT_NC}`)
		expect(body).toContain('margin-block: 0;')
		expect(body).toContain('min-height: 34px;')
	})

	it('sets a feed row on the normal line, 3px between its lines and 4px between rows', () => {
		const main = rule(`.cn-look-board .cn-record-list--feed .cn-record-list__main${NOT_NC}`)
		expect(main).toContain('line-height: normal;')
		expect(main).toContain('gap: 3px;')
		expect(rule(`.cn-look-board .cn-record-list--feed .cn-record-list__item + .cn-record-list__item${NOT_NC}`)).toContain('margin-top: 4px;')
	})
})
