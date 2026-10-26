/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list row that opens its record is a link, and the nldesign theme
 * paints every `<a>` in its link colour with an underline (`!important`, through
 * its link tokens). The boards draw the row as a list row: title in the main
 * ink, meta muted, no underline (DqContact / DqOrganisatie "Zaken"). The row
 * hands the theme the values its rules read. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-record-list-row-link-ink/specs/record-widgets/spec.md#requirement-a-board-list-row-that-is-a-link-draws-no-link-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board.css: a record-list row link', () => {
	it('hands the theme the main ink and no underline', () => {
		const body = bodyOf('.cn-look-board a.cn-record-list__row--link:not(.cn-look-nextcloud *)')
		expect(body).toContain('--nldesign-component-link-color: var(--color-main-text);')
		expect(body).toContain('--nldesign-component-link-text-decoration: none;')
		expect(body).toContain('--nldesign-color-on-surface: var(--color-main-text);')
		expect(body).toContain('text-decoration: none;')
	})
})
