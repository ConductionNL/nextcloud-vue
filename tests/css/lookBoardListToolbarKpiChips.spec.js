/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * r32: DqZakenSorteren's view switch stood 20px under its chips (board 8),
 * DqTeamwachtrij's stat cards were 114px (board 110) and its team-today
 * initials in the main ink (board the soft ink), and a card footer's
 * initials were 10.5px (board 12). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-list-toolbar-kpi-chips/specs/board-list-toolbar-kpi-chips/spec.md#requirement-the-board-list-keeps-its-toolbar-stat-and-chip-sizes
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with the given selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleEndingWith(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: list toolbar, stat cards and chips', () => {
	it('draws a stat card in the widget row without the KPI card\'s own border', () => {
		expect(ruleEndingWith('.cn-look-board .cn-index-page-widgets__cell .cn-kpi-card:not(.cn-look-nextcloud *)')).toMatch(/border-width: 0;/)
	})

	it('sets the team-today initials in the soft ink', () => {
		expect(ruleEndingWith('.cn-look-board .cn-team-workload__avatar:not(.cn-look-nextcloud *)')).toMatch(/color: var\(--cn-board-text-soft\);/)
	})

	it('sets a card footer\'s initials at 12px', () => {
		expect(ruleEndingWith('.cn-look-board .cn-object-card--board .cn-object-card__record-foot-cell .cn-cell-renderer__avatar-initials')).toMatch(/font-size: 12px;/)
	})
})
