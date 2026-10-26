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
	it('sets the rows a section apart and the items 8px apart', () => {
		const at = css.indexOf('.cn-look-board .cn-actions-bar.cn-actions-bar--board {')
		expect(css.slice(at, css.indexOf('}', at))).toContain('gap: var(--cn-board-section-gap, 20px) 8px;')
	})
})
