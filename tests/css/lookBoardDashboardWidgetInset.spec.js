/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a dashboard widget keeps the card's side inset, and a
 * stat tile in a detail side card sits on the card's inset. jsdom draws no
 * layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-widget-inset/specs/board-dashboard-widget-inset/spec.md#requirement-a-board-dashboard-widget-keeps-the-cards-side-inset
 */
const fs = require('fs')
const path = require('path')

/**
 * A stylesheet's text without its comments.
 *
 * @param {string} name The file under src/css.
 * @return {string} The text.
 */
function sheet(name) {
	return fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const board = sheet('look-board.css')
const CARD = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless)'
const INSET = 'var(--cn-board-dashboard-card-inset)'

describe('look-board.css: widgets on a board dashboard card keep its side inset', () => {
	it('defines the inset as 24px', () => {
		expect(board).toMatch(/\.cn-look-board\s*\{[^}]*--cn-board-dashboard-card-inset:\s*24px;/)
	})

	it.each([
		['the task list', '.cn-tasks-widget', `0 ${INSET} 10px`],
		['the step bar and its legend', '.cn-stacked-bar', `4px ${INSET} 22px`],
		['the week strip', '.cn-week-strip', `4px ${INSET} 22px`],
		['a bar list or matrix', '.cn-chart-widget__html', `4px ${INSET} 20px`],
		['the activity items', '.cn-nc-widget-widget__body', `0 calc(${INSET} - 4px) 16px`],
		['the decision list', '.cn-decision-list', `0 ${INSET} 20px`],
	])('pads %s', (_name, widget, padding) => {
		expect(bodyOf(board, `${CARD} ${widget}`)).toContain(`padding: ${padding};`)
	})

	/**
	 * The boards draw a widget table inside the card's inset, its header band
	 * and its cells 12px in from the table's edge (DqTermijnen, DqDoorlooptijd,
	 * DqProcesanalyse). The table used to run to the card's edge with its first
	 * and last column padded to the inset.
	 *
	 * @spec openspec/changes/board-dashboard-table-inset/specs/board-dashboard-table-inset/spec.md#requirement-a-board-dashboard-table-sits-inside-the-cards-inset
	 */
	it('puts a widget table inside the inset, its outer columns at the table\'s own 12px', () => {
		expect(bodyOf(board, `${CARD} .cn-widget-object-table`)).toContain('padding: 0 22px 20px;')
		for (const cell of ['th', 'td']) {
			expect(bodyOf(board, `${CARD} .cn-widget-object-table .cn-data-table ${cell}:first-child`)).toBe('')
			expect(bodyOf(board, `${CARD} .cn-widget-object-table .cn-data-table ${cell}:last-child`)).toBe('')
		}
	})
})

/**
 * @spec openspec/changes/board-dashboard-widget-inset/specs/board-dashboard-widget-inset/spec.md#requirement-a-stat-tile-in-a-detail-side-card-keeps-the-cards-inset
 */
describe('look-board-detail.css: a stat tile in a side card', () => {
	const detail = sheet('look-board-detail.css')
	const CONTENT = '.cn-look-board .cn-detail-page__side .cn-detail-page__card-fit > .cn-widget-wrapper__content'

	it('pads the flush card-fit content as a side card', () => {
		expect(bodyOf(detail, `${CONTENT}:has(> .cn-kpi-card--board)`)).toContain('padding: 10px 22px 20px;')
	})

	it('drops the tile\'s own padding', () => {
		expect(bodyOf(detail, `${CONTENT} > .cn-kpi-card--board`)).toContain('padding: 0;')
	})
})
