/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board settings card's title and subtitle run the card's width, wide or
 * not (r29 DqBeheerGeavanceerd: subtitle capped at 900px). Read as text.
 *
 * @spec openspec/changes/board-settings-desc-full-width/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: settings subtitle measure', () => {
	it('lifts the 900px measure on every board settings card', () => {
		const sel = '.cn-look-board .settings-section:not(.cn-look-nextcloud *) .settings-section__desc {'
		const at = css.indexOf(sel)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('max-width: none;')
	})
})
