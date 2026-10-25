/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A switch or radio in a board settings card starts at the content edge
 * (r29 DqBeheerinstellingen: control 9px in). Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-switch-radio-flush/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const S = '.cn-look-board .cn-settings-fields:not(.cn-look-nextcloud *)'

/**
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: settings switches and radios', () => {
	it('drops the content padding', () => {
		expect(body(`${S} .checkbox-content`)).toContain('padding-inline: 0;')
	})

	it('sets the board gaps', () => {
		expect(body(`${S} .checkbox-content-switch`)).toContain('gap: 12px;')
		expect(body(`${S} .checkbox-content-radio`)).toContain('gap: 10px;')
	})
})
