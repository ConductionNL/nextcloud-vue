/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In a table fitted to its tile, the growing column that opts into wrapping
 * (`cn-cell--wrap`) wraps and keeps a readable width (DqDoorlooptijd "Zaken
 * met risico": the title column was squeezed to 24px). jsdom draws no layout,
 * so the rule is read from the stylesheet.
 *
 * @spec openspec/changes/fit-table-wrap-column-keeps-width/specs/fit-table-wrap-column-keeps-width/spec.md#requirement-a-wrapping-growing-column-keeps-a-readable-width
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/table.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('table.css: a wrapping growing column in a fitted table', () => {
	it('wraps and keeps a minimum width instead of max-width 0', () => {
		const re = /([^{}]+)\{([^{}]*)\}/g
		let body = ''
		let m
		while ((m = re.exec(css))) {
			if (m[1].split(',').map((s) => s.trim()).includes('.cn-data-table--fit td.cn-table-col--grow.cn-cell--wrap')) {
				body = m[2]
			}
		}
		expect(body).toMatch(/white-space:\s*normal/)
		expect(body).toMatch(/max-width:\s*none/)
		expect(body).toMatch(/min-width:\s*8em/)
	})
})
