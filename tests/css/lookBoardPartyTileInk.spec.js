/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw every party's initials in the soft ink (#3d4047). The party
 * tiles of CnObjectPartiesWidget took the main text colour (DqZaakBetrokkenen
 * r35, Rollen: SV, JW, BL). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-party-tile-soft-ink/specs/board-party-tile-soft-ink/spec.md#requirement-a-party-tiles-initials-take-the-soft-ink
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: a party tile\'s initials take the soft ink', () => {
	it('colours the board party tile with --cn-board-text-soft', () => {
		const selector = '.cn-look-board .cn-object-parties--board .cn-object-parties__tile {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toMatch(/\bcolor: var\(--cn-board-text-soft\);/)
	})
})
