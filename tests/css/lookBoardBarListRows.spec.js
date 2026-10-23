/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard chart's bar list stands its rows 27px apart, as DqDashboard
 * draws it ("Zaken per status": 14px rows with 10px between). A row is a
 * drill button, which took Nextcloud's 3px button margin and the page's 15px
 * at line height 1.5: 38px apart. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-bar-list-rows/specs/chart-widget/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a bar list row', () => {
	it('drops the button margin and sets the row at 14px, normal line height', () => {
		const selector = '.cn-look-board .cn-chart-widget__bar-line:not(.cn-look-nextcloud *) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('margin: 0;')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('line-height: normal;')
	})
})
