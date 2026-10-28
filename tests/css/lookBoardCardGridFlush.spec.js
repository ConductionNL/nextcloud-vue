/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the card grid stands flush with the page column and the
 * page footer under it keeps the page's own gap. The boards draw the first
 * card at the column's edge (DqAanMijToegewezen 292, DqZakenSorteren 292);
 * card.css's 0.25rem grid padding put every card 3.8px in and down. The
 * footer follows the cards by the page column's gap, a theme hook
 * (`--cn-board-pager-gap`, 12px by default; the dossiq boards draw 20).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-card-grid-flush/specs/board-card-grid-flush/spec.md
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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-index.css: the card grid is flush', () => {
	it('takes away card.css padding around the grid', () => {
		expect(bodiesOf('.cn-look-board .cn-card-grid:not(.cn-look-nextcloud *)')).toContain('padding: 0;')
	})

	it('puts the footer under the cards at the page gap, 12px unless the app says otherwise', () => {
		const grid = '.cn-look-board .cn-index-page__main:not(.cn-index-page__main--table):not(.cn-index-page__main--list):not(.cn-index-page__main--map) > .cn-pagination--board'
		expect(bodiesOf(grid)).toContain('margin-top: var(--cn-board-pager-gap, 12px);')
	})
})
