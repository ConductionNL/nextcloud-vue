/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board card of cards (DqDoorlooptijd "Naleving"): a sections widget in
 * columns keeps the dashboard card's inset, and each section is a small card
 * with a hairline edge, a 10px corner, 14px 16px of padding and a 15px 700
 * heading. Read from the stylesheet text.
 *
 * @spec openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-board-card-of-cards-draws-the-boards-small-cards
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule listing an exact selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations, or ''.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const CARDS = '.cn-look-board .cn-sections-widget--grid.cn-sections-widget--cards'
const NOT_NC = ':not(.cn-look-nextcloud *)'

describe('look-board.css: a card of cards', () => {
	it('keeps the dashboard card inset round the grid', () => {
		const body = bodyOf(`.cn-look-board .cn-dashboard-page${NOT_NC} .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-sections-widget--grid`)
		expect(body).toMatch(/padding: 0 var\(--cn-board-dashboard-card-inset\) 20px;/)
	})

	it('draws each section as a small card', () => {
		const body = bodyOf(`${CARDS} .cn-sections-widget__section${NOT_NC}`)
		expect(body).toMatch(/padding: 14px 16px;/)
		expect(body).toMatch(/border: 1px solid var\(--cn-board-hairline\);/)
		expect(body).toMatch(/border-radius: 10px;/)
	})

	it('sets the section heading at 15px 700, 10px above the content', () => {
		const body = bodyOf(`${CARDS} .cn-sections-widget__heading${NOT_NC}`)
		expect(body).toMatch(/margin: 0 0 10px;/)
		expect(body).toMatch(/font-size: 15px;/)
		expect(body).toMatch(/font-weight: 700;/)
	})
})
