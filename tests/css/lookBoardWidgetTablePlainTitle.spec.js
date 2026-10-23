/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list page's title column is a 15px weight-600 underlined link (DqZaken).
 * A table inside a card or a settings section (CnWidgetObjectTable) shows its
 * first column as plain text, as DqInstellingen, DqTermijnen, DqDoorlooptijd
 * and DqProcesanalyse draw it; live drew it as the list page's link (COMPDIFF
 * r24 cell.fontWeight 400>600). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-widget-table-plain-title/specs/board-widget-table-plain-title/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: the title column', () => {
	it('is the list page\'s link everywhere but in a widget table', () => {
		const selector = '.cn-look-board .cn-table-container--board .cn-data-table td.cn-table-col--title:not(.cn-widget-object-table *) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('font-weight: 600;')
		expect(body).toContain('text-decoration: underline;')
	})
})
