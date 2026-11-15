/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard card is flush, so every widget in it carries the card's
 * side inset itself. The object list's table and its "choose a client" line,
 * the facts list and the form and knowledge-base search did not: the table
 * and the facts ran to the card's edge (PqOperationeel "Klachten", PqDashboard
 * "Taken", PqWerkplekKlant "Wie is het") and the forms kept the library's
 * 16px (PqLoyaliteit "Aanmelding loyaliteit", PqWerkplekKlant "Dit
 * contactmoment"). A related side card's link rows read at the normal leading.
 * Every rule sits under the board look, so the Nextcloud look is unchanged.
 *
 * @spec openspec/changes/board-dashboard-widget-inset/specs/board-dashboard-widget-inset/spec.md#requirement-a-board-dashboard-widget-keeps-the-cards-side-inset
 */
const fs = require('fs')
const path = require('path')

const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const css = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8'))
const detailCss = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8'))

/**
 * The body of the first rule whose selector list holds the given selector.
 *
 * @param {string} source Stylesheet text without comments.
 * @param {string} selector One selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleHolding(source, selector) {
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]')
	const m = re.exec(source)
	if (!m) {
		return ''
	}
	const open = source.indexOf('{', m.index)
	return source.slice(open, source.indexOf('}', open))
}

const card = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless)'

describe('board dashboard widgets keep the card inset', () => {
	it.each([
		`${card} .cn-object-list-widget__table`,
		`${card} .cn-object-list-widget__groups`,
		`${card} .cn-object-list-widget__prompt`,
		`${card} .cn-facts-widget`,
	])('insets %s by the card inset', (selector) => {
		expect(ruleHolding(css, selector)).toMatch(/padding: 0 var\(--cn-board-dashboard-card-inset\) 20px;/)
	})

	it('stands the title 12px above an object list table, as above a widget table', () => {
		expect(ruleHolding(css, `${card.replace(':not(.cn-widget-wrapper--borderless)', ':not(.cn-widget-wrapper--nc-dashboard):not(.cn-widget-wrapper--borderless)')}:has(> .cn-widget-wrapper__content > .cn-object-list-widget > .cn-object-list-widget__table) .cn-widget-wrapper__header`)).toMatch(/padding-bottom: 12px;/)
	})

	it.each([
		'.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper--flush:not(.cn-widget-wrapper--borderless, .cn-widget-wrapper--nc-dashboard) > .cn-widget-wrapper__content:has(> .cn-form-widget)',
		'.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper--flush:not(.cn-widget-wrapper--borderless, .cn-widget-wrapper--nc-dashboard) > .cn-widget-wrapper__content:has(> .cn-kb-search-widget)',
	])('puts a form or search on the card inset instead of 16px: %s', (selector) => {
		expect(ruleHolding(css, selector)).toMatch(/padding: 4px var\(--cn-board-dashboard-card-inset\) 20px;/)
	})

	it('sets a related side card link row at the normal leading', () => {
		const body = ruleHolding(detailCss, '.cn-look-board .cn-detail-page__side .cn-related-objects-widget .cn-related-objects-widget__links > li:not(.cn-look-nextcloud *)')
		expect(body).toMatch(/font-size: 14px;/)
		expect(body).toMatch(/line-height: normal;/)
	})
})
