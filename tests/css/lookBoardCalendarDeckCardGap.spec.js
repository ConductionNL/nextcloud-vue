/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the calendar and Deck cards (DqZaakTaken "Afspraken",
 * "Kaarten") open on a ruled row, so the rows start a full 12px under the
 * title block: no first line of text carries the half-leading the general
 * card rule takes off. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-detail.css: calendar and Deck cards open 12px under the title', () => {
	it('starts the calendar card rows 12px under the title', () => {
		expect(rulesFor('.cn-look-board .cn-detail-card .cn-detail-card__content:has(> .cn-calendar-card__list:first-child):not(.cn-look-nextcloud *)')).toContain('padding-top: 12px')
	})

	it('starts the Deck card rows 12px under the title', () => {
		expect(rulesFor('.cn-look-board .cn-detail-card .cn-detail-card__content:has(> .cn-deck-card__rows:first-child):not(.cn-look-nextcloud *)')).toContain('padding-top: 12px')
	})
})
