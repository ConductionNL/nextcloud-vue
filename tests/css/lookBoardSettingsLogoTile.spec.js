/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a settings image field's tile is 56px, radius 10, no
 * edge, 16px before its button. Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-logo-tile/specs/board-settings-logo-tile/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: settings logo tile', () => {
	it('draws the tile 56px with a 10px radius and no edge', () => {
		const tile = body('.cn-look-board .cn-settings-field__image-tile:not(.cn-look-nextcloud *)')
		expect(tile).toContain('width: 56px;')
		expect(tile).toContain('height: 56px;')
		expect(tile).toContain('border: 0;')
		expect(tile).toContain('border-radius: 10px;')
	})

	it('sets the upload button 16px after the tile', () => {
		expect(body('.cn-look-board .cn-settings-field__image-row:not(.cn-look-nextcloud *)')).toContain('gap: 16px;')
	})
})
