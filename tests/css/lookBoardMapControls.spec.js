/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The map's control bar in the board look: a column of 36px edged squares,
 * 6px apart and 12px from the corner, as DqZakenKaart draws it. jsdom draws no
 * layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-map-controls/specs/board-map-controls/spec.md#requirement-the-board-maps-buttons-are-36px-edged-squares
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

describe('look-board.css: the map control bar', () => {
	const bar = bodyOf('.cn-look-board .cn-map-widget .leaflet-bar.cn-map-widget__controls:not(.cn-look-nextcloud *)')
	const button = bodyOf('.cn-look-board .cn-map-widget .leaflet-bar a.cn-map-widget__control:not(.cn-look-nextcloud *)')

	it('is a column 6px apart, 12px from the corner, without Leaflet\'s edge', () => {
		expect(bar).toContain('flex-direction: column;')
		expect(bar).toContain('gap: 6px;')
		expect(bar).toContain('margin: 12px 12px 0 0;')
		expect(bar).toContain('border: 0;')
		expect(bar).toContain('box-shadow: none;')
	})

	it('draws each button as a 36px square with the control edge and radius', () => {
		expect(button).toContain('width: 36px;')
		expect(button).toContain('height: 36px;')
		expect(button).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(button).toContain('border-radius: var(--cn-board-control-radius);')
		expect(button).toContain('background: var(--color-main-background);')
		expect(button).toContain('color: var(--color-main-text);')
	})
})
