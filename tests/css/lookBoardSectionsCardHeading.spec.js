/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board stacked section card is titled at 700 on a 1.2 line
 * (PtPortalInstellingen). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-sections-card-heading/specs/board-sections-card-heading/spec.md#requirement-a-board-stacked-section-card-is-titled-at-700-on-a-12-line
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: stacked section card headings', () => {
	it('titles a stacked section card at 700 on a 1.2 line, the grid variant untouched', () => {
		const selector = '.cn-look-board .cn-sections-widget--cards:not(.cn-sections-widget--grid) .cn-sections-widget__heading:not(.cn-look-nextcloud *) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const rule = css.slice(at, css.indexOf('}', at))
		expect(rule).toMatch(/font-weight: 700;/)
		expect(rule).toMatch(/line-height: 1\.2;/)
		expect(rule).not.toMatch(/font-size/)
	})
})
