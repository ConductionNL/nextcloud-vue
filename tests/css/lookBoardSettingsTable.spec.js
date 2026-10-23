/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A table inside an admin settings section is drawn on the section's card,
 * not as a second bordered card inside it (DqInstellingen "Koppelingen",
 * DqVthInstellingen "Legesregels"). jsdom draws no layout, so the rules are
 * read from the stylesheet text.
 *
 * @spec openspec/changes/board-settings-table-flat/specs/board-settings-table-flat/spec.md#requirement-a-table-in-a-settings-section-has-no-card-of-its-own
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board-index.css: a table in a settings section', () => {
	it.each(['border: 0;', 'border-radius: 0;'])('has no card of its own: %s', (decl) => {
		expect(bodyOf('.cn-look-board .settings-section .cn-table-container.cn-table-container--board:not(.cn-look-nextcloud *)')).toContain(decl)
	})
})
