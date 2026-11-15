/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A wrapping title column's secondary line runs at a normal line height in the
 * board look, as DqZoekresultaten draws "Zaak 2026-0042 · Omgevingsvergunning
 * kleine bouwactiviteit" over three lines (16.8px each, not 18.9; r30 row
 * 102.7 vs 100). The title column wraps wherever it is narrow, not only when
 * marked to (DqFilterBeheren beside the open sidebar: "2026-4837 · Linda
 * Bakker" over three lines, rows 2 to 4px taller than drawn), so every title
 * column's secondary line runs so; one line at normal plus 2px is the 18.9 of
 * the table's 1.35. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-wrapped-secondary-line-height/specs/board-wrapped-secondary-line-height/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: a wrapped title cell\'s secondary line', () => {
	it('runs at a normal line height, 2px under the title, in every title cell', () => {
		const at = css.indexOf('\n.cn-look-board .cn-table-container--board .cn-data-table td.cn-table-col--title .cn-table-cell__secondary {\n\tmargin-top: 2px;')
		expect(css).not.toContain('td.cn-table-col--title.cn-cell--wrap .cn-table-cell__secondary')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/line-height: normal;/)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/margin-top: 2px;/)
	})
})
