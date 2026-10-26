/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the toolbar's search row sits 20px under the line above
 * it: the bar's 8px gap plus 12px. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: the board search row', () => {
	it('takes 12px above it when a line comes before it', () => {
		const at = css.indexOf('.cn-look-board .cn-actions-bar--board > :not(.cn-actions-bar__row--search) ~ .cn-actions-bar__row--search {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('margin-top: 12px;')
	})

	it('keeps the bar gap at 8px', () => {
		const at = css.indexOf('.cn-look-board .cn-actions-bar.cn-actions-bar--board {')
		expect(css.slice(at, css.indexOf('}', at))).toContain('gap: 8px;')
	})
})
