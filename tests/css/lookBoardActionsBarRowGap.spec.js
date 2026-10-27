/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board actions bar's view row and search row are 20px apart, as the
 * boards draw their sections (r31: the table sat 9 to 18px high on DqZaken,
 * DqTaken, DqContracten). Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-actions-bar-row-gap/specs/index-page/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: actions bar rows', () => {
	it('keeps the items 8px apart, also on a wrapped row 1', () => {
		const at = css.indexOf('.cn-look-board .cn-actions-bar.cn-actions-bar--board {')
		expect(css.slice(at, css.indexOf('}', at))).toContain('gap: 8px;')
	})

	it('sets the search row a section under row 1', () => {
		const at = css.indexOf('.cn-look-board .cn-actions-bar--board > .cn-actions-bar__row--search {')
		expect(css.slice(at, css.indexOf('}', at))).toContain('margin-top: calc(var(--cn-board-section-gap, 20px) - 8px);')
	})
})
