/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A related-objects card in a board-look side column puts its rows on the
 * card's 22px inset, under its title (PqTicket "Gerelateerd": rows 9px in,
 * board 23).
 *
 * @spec openspec/changes/board-related-side-inset/specs/board-related-side-inset/spec.md#requirement-a-related-side-card-puts-its-rows-on-the-cards-inset
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board-detail.css: a related-objects card in the side column', () => {
	it('insets the card content 14px, so its 8px rows, group titles and status lines sit 22px in', () => {
		const body = ruleFor('.cn-look-board .cn-detail-page__side .cn-widget-wrapper__content:has(> .cn-related-objects-widget):not(.cn-look-nextcloud *)')
		expect(body).toContain('padding-inline: 14px;')
	})

	it('puts the configured link rows and "show all" on the same 22px', () => {
		expect(ruleFor('.cn-look-board .cn-detail-page__side .cn-related-objects-widget .cn-related-objects-widget__links:not(.cn-look-nextcloud *)')).toContain('padding-inline: 8px;')
		expect(ruleFor('.cn-look-board .cn-detail-page__side .cn-related-objects-widget .cn-related-objects-widget__show-all:not(.cn-look-nextcloud *)')).toContain('margin-inline: 8px;')
	})
})
