/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqJourney "Journeygegevens", PqContract "Facturering", PqMailinglijst
 * "Lijstgegevens": a data grid placed bare in a section or a tab panel is
 * inset once, by the card around it, and starts 14px under the card title.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-nested-data-card-single-inset/specs/board-card/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with this selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: a bare data grid inside a card', () => {
	it('draws no second inset around the grid', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-detail-widget-host--bare > .cn-widget-wrapper.cn-widget-wrapper--chromeless > .cn-widget-wrapper__content:has(> .cn-object-data-widget__grid-wrap)')).toContain('padding: 0;')
	})

	it('starts a sections card that opens on the grid 14px under its title', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-sections-widget > .cn-sections-widget__column:first-child > .cn-sections-widget__section:first-child:not(:has(> .cn-sections-widget__heading)) > .cn-sections-widget__body > .cn-detail-widget-host--bare > .cn-widget-wrapper > .cn-widget-wrapper__content > .cn-object-data-widget__grid-wrap):not(.cn-detail-page__side *)')).toContain('padding-top: 14px;')
	})
})
