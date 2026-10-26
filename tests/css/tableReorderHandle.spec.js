/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The reorder grip floats before the row's name, so a name that wraps in a
 * narrow (fitted) cell wraps beside the grip, not under it (r31
 * DqZaaktypeVelden "welstandsgebied" sat a line below its grip). Read from the
 * stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/table.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('table.css: the reorder grip', () => {
	it('floats before the name with 10px after it', () => {
		const at = css.indexOf('.cn-table-row__handle {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('float: inline-start;')
		expect(body).toContain('margin-inline-end: 10px;')
	})
})
