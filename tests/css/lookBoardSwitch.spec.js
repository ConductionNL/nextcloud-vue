/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a switch is the boards' 38x22 pill with an 18px knob.
 * Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-switch-38x22/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const ICON = '.cn-look-board .checkbox-radio-switch-switch:not(.cn-look-nextcloud *) .checkbox-content__icon'

/**
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: switch', () => {
	it('draws a 38x22 pill, primary when on', () => {
		expect(body(ICON)).toContain('width: 38px;')
		expect(body(ICON)).toContain('height: 22px;')
		expect(body('.cn-look-board .checkbox-radio-switch-switch.checkbox-radio-switch--checked:not(.cn-look-nextcloud *) .checkbox-content__icon')).toContain('background: var(--color-primary-element);')
	})

	it('draws an 18px knob that moves to the end when on', () => {
		expect(body(`${ICON}::after`)).toContain('width: 18px;')
		expect(body('.cn-look-board .checkbox-radio-switch-switch.checkbox-radio-switch--checked:not(.cn-look-nextcloud *) .checkbox-content__icon::after')).toContain('inset-inline-start: 18px;')
	})
})
