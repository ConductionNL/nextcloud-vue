/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A strong cell's name in a board settings card reads 15px bold (r29
 * DqInstellingen Koppelingen: 14px 500 live). Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-strong-cell-name/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const C = '.cn-look-board .settings-section .cn-data-table td.cn-cell--strong:not(.cn-look-nextcloud *)'

/**
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: a strong settings cell', () => {
	it('draws the name 15px bold and leaves the cell plain', () => {
		expect(body(C)).toContain('font-weight: 400;')
		expect(body(`${C} > .cn-cell-renderer`)).toContain('font-size: 15px;')
		expect(body(`${C} > .cn-cell-renderer`)).toContain('font-weight: 700;')
	})
})
