/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTermijnen's two report cards (Kwartaalrapport, Jaarlijkse dwangsomaudit):
 * a form label at the font's normal line height 6px over its field, a summary
 * line spaced by the sections' gap alone, and the data-warnings figure drawn
 * as a figure of its card, not as a tile inside it. jsdom draws no layout, so
 * the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-report-card-rhythm/specs/board-report-card-rhythm/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const FORM = '.cn-look-board .cn-workspace-filter-widget__form:not(.cn-look-nextcloud *)'
const PLAIN = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-sections-widget--plain'

describe('look-board.css: report card rhythm', () => {
	it('sets a workspace filter label at normal leading, 6px over its field', () => {
		expect(rule(`${FORM} .cn-workspace-filter-widget__field`)).toContain('gap: 6px;')
		expect(rule(`${FORM} .cn-workspace-filter-widget__field-label`)).toContain('line-height: normal;')
	})

	it('spaces a stacked list in plain sections by the sections gap alone', () => {
		expect(rule(`${PLAIN} .cn-record-list--stacked`)).toContain('padding-bottom: 0;')
	})

	it('draws a stat in plain sections as a figure of its card', () => {
		const tile = rule(`${PLAIN} .cn-kpi-card--board.cn-kpi-card--stacked`)
		expect(tile).toContain('--cn-kpi-stacked-padding: 0;')
		expect(tile).toContain('--cn-kpi-stacked-gap: 4px;')
		expect(tile).toContain('border: 0;')
		expect(tile).toContain('background: none;')
		expect(rule(`${PLAIN} .cn-kpi-card--board.cn-kpi-card--stacked .cn-kpi-card__value`)).toContain('line-height: normal !important;')
	})
})
