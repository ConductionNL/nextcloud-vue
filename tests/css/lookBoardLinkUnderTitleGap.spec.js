/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard card's header link under its title sits 10px under it at normal
 * leading (r33 DqDashboard: rows 42px under the title, the board 46). Read from
 * the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper__header-link--under-title'

describe('look-board.css: a header link under the title', () => {
	it('sits 8px more under the title at normal leading', () => {
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('margin-top: 8px;')
		expect(body).toContain('line-height: normal;')
	})
})
