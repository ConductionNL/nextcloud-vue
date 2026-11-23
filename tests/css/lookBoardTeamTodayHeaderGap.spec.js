/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTeamwachtrij "Team vandaag": the side card's note ("6 van 6 aanwezig")
 * sits on the title row at normal leading, and the members start 14px under
 * that row, as the board draws the card (a 14px column gap).
 *
 * @spec openspec/changes/board-team-today-header-gap/specs/board-team-today-header-gap/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule whose selector list holds the given selector.
 *
 * @param {string} selector One selector of the list.
 * @return {string} The rule bodies joined, or ''.
 */
function rulesHolding(selector) {
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]', 'g')
	let out = ''
	let m
	while ((m = re.exec(css)) !== null) {
		const open = css.indexOf('{', m.index)
		out += css.slice(open, css.indexOf('}', open))
	}
	return out
}

describe('look-board-index.css: Team vandaag under its header', () => {
	const side = '.cn-look-board .cn-index-page-widgets--side-panel:not(.cn-look-nextcloud *)'

	it('keeps the side panel card content start (control)', () => {
		expect(rulesHolding(side + ' .cn-widget-wrapper__content')).toMatch(/padding: calc\(12px - var\(--cn-board-first-line-leading, 0\.15em\)\) 22px 20px;/)
	})

	it('sets the header note at normal leading', () => {
		const note = rulesHolding(side + ' .cn-index-page-widgets__note')
		expect(note).toMatch(/font-size: 13px;/)
		expect(note).toMatch(/line-height: normal;/)
	})

	it('starts the team members 14px under the header', () => {
		expect(rulesHolding(side + ' .cn-widget-wrapper__content:has(> .cn-team-workload)')).toMatch(/padding-top: 14px;/)
	})
})
