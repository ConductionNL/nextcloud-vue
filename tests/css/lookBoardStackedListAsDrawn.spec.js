/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board stacked list: due line at normal leading, footer link a block 10px
 * under the last row, 20px under the list (r33 DqDagAfsluiten Morgen eerst 188
 * vs 195). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const list = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list--stacked'

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: a stacked list', () => {
	it('sets its due line at normal leading', () => {
		expect(rule(list + ' .cn-record-list__due--below')).toContain('line-height: normal;')
	})

	it('draws its footer link as a block 10px under the rows and pads 20px under it', () => {
		const link = rule(list + ' .cn-record-list__footer-link')
		expect(link).toContain('display: block;')
		expect(link).toContain('margin-top: 10px;')
		expect(rule(list + ':has(.cn-record-list__footer-link)')).toContain('padding-bottom: 20px;')
	})
})
