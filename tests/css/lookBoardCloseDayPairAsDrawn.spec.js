/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The note list's closing pair is drawn as the board (r33 DqDagAfsluiten gap
 * 517 vs 512.8). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const pair = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-notes__all-actions'

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: the closing pair', () => {
	it('pads the cancel button 14px and the record-all button 16px, without inner text padding', () => {
		expect(rule(pair + ' .button-vue.button-vue')).toContain('--button-padding: 14px;')
		expect(rule(pair + ' .button-vue.button-vue[data-testid="cn-record-list-record-all-button"]')).toContain('--button-padding: 16px;')
		expect(rule(pair + ' .button-vue .button-vue__text.button-vue__text')).toContain('padding-inline: 0;')
	})

	it('draws an 18px icon and sits 1px further in', () => {
		expect(rule(pair + ' .button-vue__icon .material-design-icon__svg')).toContain('width: 18px;')
		expect(rule(pair)).toContain('padding-inline: 1px;')
	})
})
