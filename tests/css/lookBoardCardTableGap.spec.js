/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board card that opens on a table starts it 12px below the title's box
 * (DqZaaktypeStatussen "Statussen", "Resultaten"). jsdom draws no layout, so
 * the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-card-table-gap/specs/board-card-table-gap/spec.md#requirement-a-board-cards-table-starts-12px-below-its-title
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

describe('look-board-detail.css: a card that opens on a table', () => {
	it('starts the table 12px below the title box, not the text gap less its leading', () => {
		const body = ruleFor('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-object-list-widget):not(.cn-detail-page__side *)')
		expect(body).not.toBeNull()
		expect(body).toContain('padding-top: 12px;')
	})
})
