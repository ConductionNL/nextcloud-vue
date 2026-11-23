/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard description with filters is one 40px row and ends the
 * header 8px under it (r32 DqDoorlooptijd 50/100, DqTermijnen 90; boards 98).
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: a description with filters', () => {
	it('draws its select without a margin', () => {
		expect(rule('.cn-look-board .cn-dashboard-page__description:not(.cn-look-nextcloud *) .v-select.select.cn-dashboard-page__description-select')).toContain('margin: 0;')
	})

	it('pads 8px under it', () => {
		expect(rule('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__description--with-period')).toContain('padding-bottom: 8px;')
	})
})
