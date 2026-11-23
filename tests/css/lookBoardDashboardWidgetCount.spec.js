/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The count chip after a dashboard card's title (record-list `headerCount`)
 * is 17px tall on the board: 1px 8px around a 13px figure on a 15px line
 * (DqDagAfsluiten "Nog open van vandaag 3"). It inherited the page's line and
 * stood 21.5px. jsdom draws no layout, so the rule is read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-widget-count/specs/board-dashboard-widget-count/spec.md#requirement-a-dashboard-cards-count-chip-is-17px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board.css: dashboard card count chip', () => {
	it('sets the figure on a 15px line, so the chip is 17px', () => {
		const body = ruleFor('.cn-look-board .cn-dashboard-page__widget-count:not(.cn-look-nextcloud *)')
		expect(body).not.toBeNull()
		expect(body).toContain('box-sizing: border-box;')
		expect(body).toContain('padding: 1px 8px;')
		expect(body).toContain('font-size: 13px;')
		expect(body).toContain('line-height: 15px;')
	})
})
