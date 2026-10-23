/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The store page under the board look: the board frame, and a header without
 * the 56px inset while the navigation is open (screens-store-page-board-header).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/screens-store-page-board-header/specs/store-page/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rulesFor(selector) {
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

describe('look-board.css: store page', () => {
	it('pads the store page as every board page', () => {
		expect(rulesFor('.cn-look-board .cn-store-page:not(.cn-look-nextcloud *)')).toMatch(/padding: var\(--cn-board-content-padding\)/)
	})

	it('drops the header inset while the navigation is open, and keeps it while it is closed', () => {
		expect(rulesFor('.cn-look-board .cn-store-page:not(.cn-look-nextcloud *) .cn-store-page__header')).toMatch(/padding-inline-start: 0/)
		expect(rulesFor('.cn-look-board:has(.app-navigation--closed) .cn-store-page:not(.cn-look-nextcloud *) .cn-store-page__header')).toMatch(/padding-inline-start: 56px/)
	})
})
