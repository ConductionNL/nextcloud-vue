/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A two-line record-list row on a board dashboard is 60px, its title and meta
 * at the normal line height (r31 DqDashboard rows 69px). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: dashboard record-list rows', () => {
	it.each(['title', 'meta'])('sets the %s at the normal line height', (part) => {
		expect(rule(`.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list__${part}`)).toContain('line-height: normal;')
	})
})
