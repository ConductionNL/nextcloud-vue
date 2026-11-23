/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board map card: the map on a 520px basis beside the 320px list, 18px
 * apart (DqZakenKaart: map 655, list 409). jsdom draws no layout, so the rules
 * are read from the stylesheet text.
 *
 * @spec openspec/changes/board-map-card-split/specs/board-map-card-split/spec.md#requirement-the-board-map-card-splits-as-the-board-does
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

describe('look-board-index.css: the map card split', () => {
	it('puts 18px between the map and the list', () => {
		expect(bodyOf('.cn-look-board .cn-index-page__map-card:not(.cn-look-nextcloud *)')).toContain('gap: 18px;')
	})

	it('gives the map a 520px basis', () => {
		expect(bodyOf('.cn-look-board .cn-index-page__map-card .cn-index-page__map:not(.cn-look-nextcloud *)')).toContain('flex: 3 1 520px;')
	})
})
