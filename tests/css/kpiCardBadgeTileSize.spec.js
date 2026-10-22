/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board's KPI tile with its icon in a circle at the end (DqDashboard,
 * DqMijnTeam) is padded 20px 22px with 8px between its lines and sets its
 * 28px figure at the font's normal line height: 153px with a two-line caption,
 * where live drew 140 (18px 20px, 6px, the theme's line height 1). Tiles
 * without the end badge keep their own board sizes. Read from the stylesheet.
 *
 * @spec openspec/changes/board-kpi-badge-tile-size/specs/stat-tile-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/kpi-card.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? null : css.slice(at, css.indexOf('}', at))
}

const TILE = '.cn-kpi-card--board.cn-kpi-card--stacked:has(.cn-kpi-card__title--badge-end)'

describe('kpi-card.css: the board tile with its badge at the end', () => {
	it('is padded 20px 22px with 8px between its lines', () => {
		const rule = body(TILE)
		expect(rule).toContain('--cn-kpi-stacked-padding: 20px 22px;')
		expect(rule).toContain('--cn-kpi-stacked-gap: 8px;')
	})

	it('sets its figure at the normal line height, over the theme\'s', () => {
		expect(body(`${TILE} .cn-kpi-card__value`)).toContain('line-height: normal !important;')
	})
})
