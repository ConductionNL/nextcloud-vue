/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board dashboard header spaces its rows 6px apart, so the description
 * under the title takes no margin of its own: with both, the line sat 19px
 * under the title against 13px drawn (COMPDIFF r24, DqMijnWerk, DqDashboard,
 * DqMijnTeam, DqInspectie).
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: the board dashboard description', () => {
	it('takes no top margin of its own under the header\'s 6px row gap', () => {
		expect(css).toMatch(/\.cn-dashboard-page__header \{[^}]*row-gap: 6px/)
		expect(rule('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__header .cn-dashboard-page__description')).toContain('margin-top: 0')
	})
})
