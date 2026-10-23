/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board stat tile in any dashboard card-fit cell carries only its own
 * inset (no cell padding, no 2px tile border), and its label and caption sit
 * at the normal line height (DqTermijnen, DqMijnWerk). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-stat-tile-inset/specs/board-stat-tile-inset/spec.md#requirement-a-board-stat-tile-in-a-card-fit-cell-sits-on-the-boards-inset
 * @spec openspec/changes/board-stat-tile-inset/specs/board-stat-tile-inset/spec.md#requirement-a-board-stat-tiles-label-and-caption-are-set-at-the-normal-line-height
 */
const fs = require('fs')
const path = require('path')

/**
 * Every rule of a stylesheet as `{ selectors, body }`.
 *
 * @param {string} file The stylesheet under src/css.
 * @return {Array<{selectors: string[], body: string}>} The rules.
 */
function rules(file) {
	const css = fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		out.push({ selectors: m[1].split(/,(?![^(]*\))/).map((s) => s.trim()), body: m[2] })
	}
	return out
}

/**
 * The declarations of every rule listing an exact selector, joined.
 *
 * @param {string} file The stylesheet under src/css.
 * @param {string} selector The selector.
 * @return {string} The declarations, or ''.
 */
function bodyOf(file, selector) {
	return rules(file).filter((r) => r.selectors.includes(selector)).map((r) => r.body).join('\n')
}

const FIT = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-dashboard-page__card-fit'

describe('board stat tile inset', () => {
	it('drops the card-fit padding around a board tile anywhere on the dashboard', () => {
		expect(bodyOf('look-board.css', `${FIT} .cn-widget-wrapper__content:has(> .cn-kpi-card--board.cn-kpi-card--stacked)`)).toMatch(/padding:\s*0;/)
	})

	it('drops the tile\'s own transparent border in a card-fit cell', () => {
		expect(bodyOf('look-board.css', `${FIT} .cn-kpi-card--board.cn-kpi-card--stacked`)).toMatch(/border-width:\s*0;/)
	})

	it('sets the label and the caption at the normal line height', () => {
		for (const part of ['__title', '__title-text', '__caption-line']) {
			expect(bodyOf('kpi-card.css', `.cn-kpi-card--board.cn-kpi-card--stacked .cn-kpi-card${part}`)).toMatch(/line-height:\s*normal;/)
		}
	})
})
