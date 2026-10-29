/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakEmail r36: the hint under the template row ("Het concept opent in
 * Nextcloud Mail…") is 13px on the normal line as drawn; live drew it at the
 * body's 15px/22.5, which put the mail rows 9px low.
 *
 * @spec openspec/changes/board-mail-tab-hint/specs/mail-tab/spec.md
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

describe('the mail tab hint in the board look', () => {
	it('is 13px on the normal line', () => {
		const hint = bodyOf('.cn-look-board .cn-detail-widget-host .cn-mail-tab__hint:not(.cn-look-nextcloud *)')
		expect(hint).toContain('font-size: 13px;')
		expect(hint).toContain('line-height: normal;')
	})
})
