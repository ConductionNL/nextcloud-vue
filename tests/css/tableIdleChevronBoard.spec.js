/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look an unsorted column's chevron is solid in the control
 * border grey, as the boards draw it (DqZaakAssistent "Moment").
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/table.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('table.css: the idle chevron in the board look', () => {
	it('is solid in the control border grey', () => {
		const at = css.indexOf('.cn-look-board .cn-table-header__chevron--idle:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('var(--cn-board-control-border')
		expect(body).toContain('opacity: 1')
	})
})
