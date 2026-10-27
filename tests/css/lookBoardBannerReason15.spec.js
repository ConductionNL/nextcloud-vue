/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard banner's reason line is 15px at normal leading (r32
 * DqMijnWerk "Vandaag eerst": 14px at 1.5). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-banner-widget:not(.cn-banner-widget--stacked) .cn-banner-widget__reason'

describe('look-board.css: a dashboard banner reason', () => {
	it('is 15px at normal leading, through the paragraph tokens too', () => {
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('font-size: 15px;')
		expect(body).toContain('line-height: normal;')
		expect(body).toContain('--nldesign-component-paragraph-font-size: 15px;')
	})
})
