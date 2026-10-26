/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A wrapping title column's secondary line runs at a normal line height in the
 * board look, as DqZoekresultaten draws "Zaak 2026-0042 · Omgevingsvergunning
 * kleine bouwactiviteit" over three lines (16.8px each, not 18.9; r30 row
 * 102.7 vs 100). A single-line secondary keeps the table's 1.35. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-wrapped-secondary-line-height/specs/board-wrapped-secondary-line-height/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: a wrapped title cell\'s secondary line', () => {
	it('runs at a normal line height only in a wrapping title cell', () => {
		const at = css.indexOf('.cn-look-board .cn-table-container--board .cn-data-table td.cn-table-col--title.cn-cell--wrap .cn-table-cell__secondary {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/line-height: normal;/)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/margin-top: 2px;/)
	})
})
