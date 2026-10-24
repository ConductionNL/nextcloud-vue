/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard row with one action (DqMijnTeam "Wachtrij van uw team",
 * "Oppakken") draws the action as an outlined button sized to its label and
 * its title link in the main ink. jsdom draws no layout, so the rules are
 * read from the stylesheet.
 *
 * @spec openspec/changes/board-row-action-outlined/specs/board-row-action-outlined/spec.md#requirement-a-dashboard-rows-action-is-an-outlined-button
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const PREFIX = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)'

/**
 * The declarations of the rule whose selector list holds the selector.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations, '' when no rule has it.
 */
function declarationsOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board: a dashboard row action is an outlined button', () => {
	it('outlines the action and sizes it to its label', () => {
		const rule = declarationsOf(`${PREFIX} .cn-record-list__action`)
		expect(rule).toMatch(/border:\s*1px solid var\(--cn-board-control-border\)/)
		expect(rule).toMatch(/border-radius:\s*8px/)
		expect(rule).toMatch(/background:\s*var\(--color-main-background\)/)
		expect(rule).toMatch(/flex:\s*none/)
		expect(rule).toMatch(/--nldesign-color-on-surface:\s*var\(--color-main-text\)/)
	})

	it('draws the title link in the main ink', () => {
		const rule = declarationsOf(`${PREFIX} .cn-record-list__row--action .cn-record-list__title--link`)
		expect(rule).toMatch(/--nldesign-color-on-surface:\s*var\(--color-main-text\)/)
	})
})
