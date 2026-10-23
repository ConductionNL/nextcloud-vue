/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look an object list marked `tableBleed` runs its table under
 * the detail card's 22px side padding, its outer cells padded 22px so the
 * column text lines up with the card title (DqZaakContact "Contactmomenten op
 * deze zaak": 23px in, against 35px inset).
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const TABLE = '.cn-look-board .cn-detail-page .cn-widget-wrapper__content > .cn-object-list-widget--bleed .cn-table-container'

describe('look-board-detail.css: an object list table edge to edge', () => {
	it('bleeds by the card\'s own side inset, which stays 22px', () => {
		const board = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8')
		expect(board).toContain('--cn-board-card-inline-padding: 22px;')
		expect(board).toContain('--cn-board-card-padding: 20px var(--cn-board-card-inline-padding);')
	})

	it('runs the table under the card\'s 22px side padding', () => {
		expect(rule(TABLE)).toContain('margin-inline: calc(-1 * var(--cn-board-card-inline-padding))')
	})

	it('pads the outer cells 22px', () => {
		expect(rule(TABLE + ' :is(th, td):first-child')).toContain('padding-inline-start: var(--cn-board-card-inline-padding)')
		expect(rule(TABLE + ' :is(th, td):last-child')).toContain('padding-inline-end: var(--cn-board-card-inline-padding)')
	})
})
