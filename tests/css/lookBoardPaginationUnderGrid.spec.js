/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Under a card grid the board's page footer is a plain row under the cards:
 * 4px 0, no hairline (DqAanMijToegewezen, BqAgents, BqStore). In a table card
 * it keeps the card's hairline and 12px 16px. jsdom draws no layout, so the
 * rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-pagination-under-card-grid/specs/board-pagination-under-card-grid/spec.md#requirement-the-page-footer-under-a-card-grid-is-a-plain-row
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-index.css: page footer under a card grid', () => {
	const grid = '.cn-look-board .cn-index-page__main:not(.cn-index-page__main--table) > .cn-pagination--board'

	it('is a plain row: 4px 0, no hairline', () => {
		const body = bodiesOf(grid)
		expect(body).toContain('padding: 4px 0;')
		expect(body).toContain('border-top: 0;')
	})

	it('keeps the hairline and 12px 16px in a table card', () => {
		const body = bodiesOf('.cn-look-board .cn-pagination.cn-pagination--board')
		expect(body).toContain('padding: 12px 16px;')
		expect(body).toContain('border-top: 1px solid var(--cn-board-hairline);')
	})
})
