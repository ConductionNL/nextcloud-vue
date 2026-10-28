/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakArchivering r34 (Bewaring y +16.4, the card's note y +14.4, "LH"
 * 138,0,0 vs 163,0,0): in the board look the archiving card's fact values sit
 * on the font's normal line (a fact row 59px, 64 on the body's 1.5), and the
 * legal hold mark takes the board's red tag ink and ground.
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

describe('the archiving card in the board look (r34)', () => {
	it('sets a fact value on the normal line', () => {
		expect(bodyOf('.cn-look-board .cn-retention .cn-retention__fact dd')).toContain('line-height: normal;')
	})

	it('draws the legal hold mark in the board\'s red tag tones', () => {
		const mark = bodyOf('.cn-look-board .cn-retention .cn-retention__mark--hold:not(.cn-look-nextcloud *)')
		expect(mark).toContain('color: var(--nl-color-red-text, var(--color-error-text));')
		expect(mark).toContain('background: var(--nl-color-red-light, var(--color-error-light, #fcedec));')
	})
})
