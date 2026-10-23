/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a file's side card (CnFilesBrowser: "Wie mag dit zien",
 * "Controlegetal") is the board's side card: radius 12, 20px 22px of
 * padding, the title a 15px muted heading at 600, the facts 8px 16px apart
 * with the values at 500 (DqDocumentenBeheer; COMPDIFF r21 "Controlegetal"
 * 700 vs 600). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-files-side-card/specs/board-files-side-card/spec.md#requirement-a-board-file-side-card-is-the-boards-side-card
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or ''.
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

const CARD = '.cn-look-board .cn-files-browser__side-card:not(.cn-look-nextcloud *)'

describe('look-board-detail.css: a file side card', () => {
	it('is the board card: radius 12, 20px 22px, 10px between its parts', () => {
		const body = bodyOf(CARD)
		expect(body).toContain('border-radius: var(--cn-board-card-radius);')
		expect(body).toContain('padding: var(--cn-board-card-padding);')
		expect(body).toContain('gap: 10px;')
	})

	it('titles it as a side card', () => {
		const body = bodyOf(`${CARD} .cn-files-browser__side-title`)
		expect(body).toContain('font-size: var(--cn-board-side-heading-size);')
		expect(body).toContain('font-weight: 600;')
		expect(body).toContain('color: var(--color-text-maxcontrast) !important;')
	})

	it('spaces the facts 8px 16px with the values at 500', () => {
		expect(bodyOf(`${CARD} .cn-files-browser__side-facts`)).toContain('gap: 8px 16px;')
		expect(bodyOf(`${CARD} .cn-files-browser__side-facts dd`)).toContain('font-weight: 500;')
	})
})
