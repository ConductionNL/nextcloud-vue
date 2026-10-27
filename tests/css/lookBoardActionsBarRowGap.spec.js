/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board actions bar's view row and search row are 20px apart, as the
 * boards draw their sections (r31: the table sat 9 to 18px high on DqZaken,
 * DqTaken, DqContracten), and a wrapped part of row 1 sits 8px under it:
 * beside a side panel the view switch always takes that line (r32
 * DqFilterBeheren 12px low, DqFilterInMenu 46px high). Read as text: jsdom
 * draws no layout.
 *
 * @spec openspec/changes/board-actions-bar-row-gap/specs/index-page/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: actions bar rows', () => {
	it('keeps lines and items 8px apart and puts the search row 20px under row 1', () => {
		const at = css.indexOf('.cn-look-board .cn-actions-bar.cn-actions-bar--board {')
		expect(css.slice(at, css.indexOf('}', at))).toContain('gap: 8px;')
		const row = css.indexOf('.cn-look-board .cn-actions-bar--board > .cn-actions-bar__row--search {')
		expect(css.slice(row, css.indexOf('}', row))).toContain('margin-top: 12px;')
	})

	it('puts the view switch on a line of its own beside a side panel, Filter at the end of row 1', () => {
		const open = '.cn-look-board .cn-index-page--sidebar-open .cn-actions-bar--board'
		const at = (sel) => css.slice(css.indexOf(sel + ' {'), css.indexOf('}', css.indexOf(sel + ' {')))
		expect(at(open + '::after')).toContain('flex: 0 0 100%;')
		expect(at(open + ' .cn-actions-bar__view-toggle')).toContain('order: 2;')
		expect(at(open + ' > .cn-actions-bar__row--search')).toContain('order: 3;')
		expect(at(open + ' .cn-actions-bar__filter-button')).toContain('margin-inline-start: auto;')
	})
})
