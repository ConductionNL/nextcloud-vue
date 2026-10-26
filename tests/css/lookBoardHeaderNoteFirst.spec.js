/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card's own header items (a count note such as "2 gepland", a status
 * pill) stand before the manifest's title-row buttons, as the boards draw
 * them (DqZaakTaken "Wat hierna komt": "2 gepland" then "+ Toevoegen"; r30
 * drew the button first). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-header-note-first/specs/widget-header/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: header items first', () => {
	it('orders the widget\'s own header items before the manifest buttons', () => {
		const selector = '.cn-look-board .cn-widget-wrapper__actions > .cn-detail-widget-header-items:not(.cn-look-nextcloud *) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/order:\s*-1/)
	})
})
