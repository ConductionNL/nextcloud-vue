/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board link tile is a rounded card with its icon beside the title
 * (PtThemas). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-link-tile/specs/board-link-tile/spec.md#requirement-a-board-link-tile-is-a-rounded-card-with-its-icon-beside-the-title
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function block(selector) {
	const at = css.indexOf(selector)
	expect(at).toBeGreaterThan(-1)
	const open = css.indexOf('{', at)
	return css.slice(open, css.indexOf('}', open))
}

describe('look-board.css: link tiles', () => {
	it('rounds the tile', () => {
		expect(block('.cn-look-board .cn-tile-widget:not(.cn-look-nextcloud *) {')).toMatch(/border-radius: var\(--cn-board-card-radius, 12px\);/)
	})

	it('lays the icon beside the text on the card inset', () => {
		const link = block('.cn-look-board .cn-tile-widget .cn-tile-widget__link:not(.cn-look-nextcloud *) {')
		expect(link).toMatch(/flex-direction: row;/)
		expect(link).toMatch(/padding: 20px 22px;/)
		expect(block('.cn-look-board .cn-tile-widget .cn-tile-widget__text:not(.cn-look-nextcloud *) {')).toMatch(/display: flex;/)
	})

	it('sets the title at 15px', () => {
		expect(block('.cn-look-board .cn-tile-widget .cn-tile-widget__title:not(.cn-look-nextcloud *) {')).toMatch(/font-size: 15px;/)
	})
})
