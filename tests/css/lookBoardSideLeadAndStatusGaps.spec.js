/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The case boards' side cards: a lead card keeps the 12px it opens with
 * between the lead and its link (DqZaak "Aanvrager": Contactgegevens bekijken
 * 10px under the lead, board 12), and a status card starts its explanation
 * 10px under the title, the explanation on the normal line (COMPDIFF r35
 * Status gapBelowTitle 7.7 vs 10). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-side-lead-and-status-gaps/specs/board-side-lead-and-status-gaps/spec.md
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

describe('look-board-detail.css: side lead and status gaps', () => {
	it('keeps 12px between a side lead and what follows it', () => {
		expect(rule(`${side} .cn-facts-widget:has(> .cn-facts-widget__lead:first-child)${NOT_NC}`)).toContain('gap: 12px;')
	})

	it('starts a side status card 10px under its title', () => {
		expect(rule(`${side} .cn-widget-wrapper__content:has(> .cn-sections-widget)${NOT_NC}`)).toContain('padding-top: 10px;')
	})
})
