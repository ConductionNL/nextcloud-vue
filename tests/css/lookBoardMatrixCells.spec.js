/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards set a matrix chart (DqProcesanalyse "Dagen per fase") at 14px,
 * its heads and figures at 600 and its cells at the normal line height, 37px
 * high. Live the cells were 42.5px at 15px 400. A cell is a span, so under a
 * theme that forces the body ink onto spans its ink goes to
 * --nldesign-color-on-surface. Read from the stylesheet and component text.
 *
 * @spec openspec/changes/board-matrix-cells/specs/board-matrix-cells/spec.md#requirement-a-board-matrix-takes-the-boards-type
 */
const fs = require('fs')
const path = require('path')

const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const board = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8'))
const widget = strip(fs.readFileSync(path.join(__dirname, '../../src/components/CnChartWidget/CnChartWidget.vue'), 'utf8'))

/**
 * The body of the rule whose selector list ends with the given selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The last selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleEndingWith(css, selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const matrix = '.cn-look-board .cn-chart-widget__matrix:not(.cn-look-nextcloud *)'

describe('board matrix chart', () => {
	it('sets the matrix at 14px and the normal line height', () => {
		const rule = ruleEndingWith(board, matrix)
		expect(rule).toMatch(/font-size: 14px;/)
		expect(rule).toMatch(/line-height: normal;/)
	})

	it('sets the column heads at 600', () => {
		expect(ruleEndingWith(board, `${matrix} .cn-chart-widget__matrix-head`)).toMatch(/font-weight: 600;/)
	})

	it('sets the cell figures at 600', () => {
		expect(ruleEndingWith(board, `${matrix} .cn-chart-widget__matrix-cell:not(.cn-chart-widget__matrix-cell--current)`)).toMatch(/font-weight: 600;/)
	})

	it('hands the heads and the lightest and darkest cells their ink under a theme', () => {
		expect(ruleEndingWith(widget, '.cn-chart-widget__matrix-head'))
			.toContain('--nldesign-color-on-surface: var(--color-text-maxcontrast)')
		expect(ruleEndingWith(widget, '.cn-chart-widget__matrix-cell--1'))
			.toContain('--nldesign-color-on-surface: var(--color-primary-element-light-text)')
		expect(ruleEndingWith(widget, '.cn-chart-widget__matrix-cell--4'))
			.toContain('--nldesign-color-on-surface: var(--color-primary-element-text)')
	})
})
