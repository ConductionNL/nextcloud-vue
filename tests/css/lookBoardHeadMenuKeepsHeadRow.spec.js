/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the menus CnIndexPage puts in the row-actions column's
 * head (`filterMenu` beside a side panel, `columnMenu`) take the board's
 * 22px head control, as the column funnels do, so the head row keeps the
 * board's height: a 34px menu button made PqTaken's head row 58.5px where
 * the board draws 49.5 (COMPDIFF pl6). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-head-menu-keeps-head-row/specs/board-head-menu-keeps-head-row/spec.md#requirement-a-board-head-menu-keeps-the-head-row-height
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or ''.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

describe('look-board-index.css: a menu in the row-actions head', () => {
	const MENU = '.cn-look-board .cn-table-container--board .cn-data-table th.cn-table-col--actions .action-item'

	it('takes the 22px head control size', () => {
		expect(bodyOf(MENU)).toContain('--default-clickable-area: 22px;')
	})

	it('is the same size as the column funnel', () => {
		const funnel = bodyOf('.cn-look-board .cn-table-container--board .cn-data-table th .cn-table-header__filter')
		expect(funnel).toContain('height: 22px;')
	})
})
