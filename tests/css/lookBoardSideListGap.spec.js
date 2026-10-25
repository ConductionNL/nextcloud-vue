/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board side card that opens on a list starts its first row 10px below the
 * title box (DqZaaktypeRegels, DqZaaktypeStatussen "Versies").
 *
 * @spec openspec/changes/board-side-list-gap/specs/board-side-list-gap/spec.md#requirement-a-board-side-cards-list-starts-10px-below-its-title
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

describe('look-board-detail.css: a side card that opens on a list', () => {
	it('starts the list 10px below the title box', () => {
		expect(ruleFor('.cn-look-board .cn-detail-page__side .cn-widget-wrapper__content:has(> .cn-record-list--rows)')).toContain('padding-top: 10px;')
	})
})
