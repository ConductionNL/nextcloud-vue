/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The parties widget's rows in the board look, as DqZaakBetrokkenen "Rollen"
 * draws them: one ruled row per party, 12px high-padded, a 32px initials
 * tile, the name 15/600 over a 13px muted meta line, the pills at the end;
 * the role headings visually hidden (the meta line names the role).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-parties-rows/specs/parties/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const B = '.cn-look-board .cn-object-parties--board'

describe('look-board-detail.css: parties rows', () => {
	it('rules each party row and pads it 12px', () => {
		const body = rule(B + ' .cn-object-parties__party')
		expect(body).toContain('padding: 12px 0')
		expect(body).toContain('border-top: 1px solid var(--cn-board-hairline)')
	})

	it('draws a 32px initials tile', () => {
		const body = rule(B + ' .cn-object-parties__tile')
		expect(body).toContain('width: 32px')
		expect(body).toContain('border-radius: 16px')
	})

	it('sets the name 15/600 and the meta 13px muted', () => {
		expect(rule(B + ' .cn-object-parties__name')).toContain('font-size: 15px')
		expect(rule(B + ' .cn-object-parties__meta')).toContain('font-size: 13px')
	})

	it('hides the role headings visually, keeping them for assistive tech', () => {
		expect(rule(B + ' .cn-object-parties__role-label')).toContain('clip-path: inset(50%)')
	})

	it('stands the rows 8px under the accepted kinds strip (r29: 12)', () => {
		expect(rule(B)).toContain('gap: 8px')
	})
})
