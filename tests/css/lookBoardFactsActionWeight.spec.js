/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts card's tinted action ("Contact vastleggen" beside a contact,
 * "Aan een programma koppelen" on the programme card) is set at 600 on the
 * boards (DqContact, DqZaakGerelateerd); the widget drew it bold. jsdom draws
 * no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-facts-action-weight/specs/board-facts-action-weight/spec.md#requirement-a-facts-cards-action-is-set-at-600
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

describe('look-board-detail.css: facts card action', () => {
	it('sets the action at 600', () => {
		expect(ruleFor('.cn-look-board .cn-facts-widget__action:not(.cn-look-nextcloud *)')).toContain('font-weight: 600;')
	})
})
