/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A table on a board dashboard card has no frame of its own and its pager sits
 * on the card's inset (r32 DqDoorlooptijd: a second frame, the pager 16px in).
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const card = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper__content'

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: a table on a dashboard card', () => {
	it('draws no border or radius', () => {
		const body = rule(card + ' .cn-table-container.cn-table-container--board')
		expect(body).toContain('border: 0;')
		expect(body).toContain('border-radius: 0;')
	})

	it('pads its pager 12px at the top only', () => {
		expect(rule(card + ' .cn-table-container--board .cn-pagination.cn-pagination--board')).toContain('padding: 12px 0 0;')
	})
})
