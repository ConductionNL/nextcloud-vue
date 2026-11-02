/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakEmail "Notities": an authored note row reads in the main ink with no
 * underline, as drawn. A theme's `a { color; text-decoration }` carries
 * `!important`, and NcListItem draws its row as an anchor.
 *
 * @spec openspec/changes/notes-tab-authored-rows/specs/notes-tab-authored-rows/spec.md#requirement-the-notes-tab-can-draw-a-note-as-an-authored-row
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body.
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

describe('an authored note row in the board look', () => {
	it('keeps the main ink and no underline against a theme\'s link rule', () => {
		const row = bodyOf('.cn-look-board .cn-detail-widget-host .cn-notes-tab__row--authored .list-item__anchor:not(.cn-look-nextcloud *)')
		expect(row).toContain('color: var(--color-main-text) !important;')
		expect(row).toContain('text-decoration: none !important;')
	})

	it('writes its meta line in the muted ink with no underline', () => {
		const meta = bodyOf('.cn-look-board .cn-detail-widget-host .cn-notes-tab__row--authored .cn-notes-tab__meta:not(.cn-look-nextcloud *)')
		expect(meta).toContain('color: var(--color-text-maxcontrast) !important;')
		expect(meta).toContain('text-decoration: none !important;')
	})
})
