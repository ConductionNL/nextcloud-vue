/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A plain table in a board settings card reads as the board's settings
 * tables (r29 DqBeheerGeavanceerd: 15px bold dark heads on a grey ground,
 * 8px 6px cells). jsdom draws no layout, so the rules are read as text.
 *
 * @spec openspec/changes/board-settings-plain-tables/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const T = '.cn-look-board .settings-section table:not(.cn-data-table):not(.cn-look-nextcloud *)'

/**
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: a plain settings table', () => {
	it('draws the board head', () => {
		const head = body(`${T} th`)
		expect(head).toContain('padding: 10px 12px;')
		expect(head).toContain('font-size: 14px;')
		expect(head).toContain('font-weight: 600;')
		expect(head).toContain('--nldesign-component-table-header-color: var(--color-text-maxcontrast);')
	})

	it('draws the board cells', () => {
		const cell = body(`${T} td`)
		expect(cell).toContain('padding: 10px 12px;')
		expect(cell).toContain('color: var(--color-main-text);')
		expect(cell).toContain('font-size: 14px;')
	})
})
