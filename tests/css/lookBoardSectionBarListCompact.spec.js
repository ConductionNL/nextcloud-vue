/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A bar list in a framed section of a sections card is the board's small
 * list (DqDoorlooptijd "Naleving per zaaktype"): 13px rows 8px apart, a 10px
 * bar. Read from the stylesheet.
 *
 * @spec openspec/changes/board-section-bar-list-compact/specs/board-section-bar-list-compact/spec.md#requirement-a-bar-list-in-a-sections-card-section-is-compact
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const LIST = '.cn-look-board .cn-sections-widget__section .cn-chart-widget__bar-list:not(.cn-look-nextcloud *)'

/**
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function rule(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board: a bar list in a sections card section', () => {
	it('sets 13px rows 8px apart with a 10px bar', () => {
		expect(rule(LIST)).toMatch(/gap:\s*8px/)
		expect(rule(`${LIST} .cn-chart-widget__bar-line`)).toMatch(/font-size:\s*13px/)
		expect(rule(`${LIST} .cn-chart-widget__bar-line`)).toMatch(/grid-template-columns:\s*150px minmax\(0, 1fr\) 48px/)
		expect(rule(`${LIST} .cn-chart-widget__bar-track`)).toMatch(/height:\s*10px/)
	})
})
