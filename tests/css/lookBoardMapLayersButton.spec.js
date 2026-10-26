/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the base-map switch is the board's 36px edged square,
 * 12px in from the top left, around an 18px layers icon in the main ink
 * (DqZakenKaart). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-map-layers-button/specs/board-map-layers-button/spec.md#requirement-the-base-map-switch-is-a-named-board-button
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board.css: base-map switch', () => {
	it('draws the control as an edged square 12px in', () => {
		const rule = ruleEndingWith('.cn-look-board .cn-map-widget .leaflet-control-layers:not(.cn-look-nextcloud *)')
		expect(rule).toMatch(/margin: 12px 0 0 12px;/)
		expect(rule).toMatch(/border: 1px solid var\(--cn-board-control-border\);/)
		expect(rule).toMatch(/box-shadow: none;/)
	})

	it('draws the toggle 34px with an 18px icon in the main ink', () => {
		const rule = ruleEndingWith('.cn-look-board .cn-map-widget .leaflet-control-layers .leaflet-control-layers-toggle:not(.cn-look-nextcloud *)')
		expect(rule).toMatch(/width: 34px;/)
		expect(rule).toMatch(/background: var\(--color-main-text\);/)
		expect(rule).toMatch(/\tmask: url\(.*\) center \/ 18px 18px no-repeat;/)
	})
})
