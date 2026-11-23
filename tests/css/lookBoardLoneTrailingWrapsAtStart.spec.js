/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard row's lone trailing line wraps under the text at its start, at
 * normal leading (r32 DqDashboard Vastgelopen 77 vs 83). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list__aside:has(> .cn-record-list__trailing:only-child)'

describe('look-board.css: a lone trailing line', () => {
	it('starts at the row start and sits at normal leading', () => {
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('margin-inline-start: 0;')
		expect(body).toContain('line-height: normal;')
	})

	it('keeps 260px of text beside it', () => {
		const main = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list__row:has(> .cn-record-list__aside > .cn-record-list__trailing:only-child) > .cn-record-list__main'
		const at = css.indexOf(main + ' {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('flex-basis: 260px;')
	})
})
