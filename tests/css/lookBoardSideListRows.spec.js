/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list in a board side card: a hairline over every row, the first too; row
 * titles without an underline at rest; a 13px muted footer note through the
 * theme's paragraph tokens (DqZaaktypeStatussen, DqZaaktypeRegels "Versies").
 *
 * @spec openspec/changes/board-side-list-rows/specs/board-side-list-rows/spec.md#requirement-a-board-side-cards-list-draws-its-rows-as-the-boards-do
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board.css: a side card list', () => {
	it('draws a hairline over every row, the first too', () => {
		expect(ruleFor('.cn-look-board .cn-detail-page__side .cn-record-list--rows:not(.cn-look-nextcloud *) .cn-record-list__item')).toContain('border-top: 1px solid var(--cn-board-hairline);')
	})

	it('draws the row title without an underline at rest', () => {
		expect(ruleFor('.cn-look-board .cn-detail-page__side .cn-record-list--rows:not(.cn-look-nextcloud *) .cn-record-list__row:not(:hover):not(:focus-visible) .cn-record-list__title')).toContain('text-decoration: none;')
	})

	it('hands the theme a 13px muted footer note', () => {
		const body = ruleFor('.cn-look-board .cn-record-list__footer-note:not(.cn-look-nextcloud *)')
		expect(body).toContain('--nldesign-component-paragraph-font-size: 13px;')
		expect(body).toContain('--nldesign-component-paragraph-color: var(--color-text-maxcontrast);')
	})
})
