/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the cards beside an index page's list are the board's
 * side cards, and a record list table is the board's compact grid. jsdom
 * draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-side-panel-cards/specs/board-index-side-panel-cards/spec.md#requirement-a-board-index-side-panel-card-is-the-boards-side-card
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
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const index = sheet('look-board-index.css')
const PANEL = '.cn-look-board .cn-index-page-widgets--side-panel:not(.cn-look-nextcloud *)'

describe('look-board-index.css: a side-panel card is the board\'s side card', () => {
	it('puts the cards the section gap apart', () => {
		expect(bodyOf(index, PANEL)).toContain('gap: var(--cn-board-section-gap, 20px);')
	})

	it('draws the header on the card inset without a rule', () => {
		const header = bodyOf(index, `${PANEL} .cn-widget-wrapper__header`)
		expect(header).toContain('border-bottom: none;')
		expect(header).toContain('padding: 20px 22px 0;')
	})

	it('draws the title as the 15px muted side label at the normal line height', () => {
		const title = bodyOf(index, `${PANEL} .cn-widget-wrapper__title`)
		expect(title).toContain('color: var(--color-text-maxcontrast) !important;')
		expect(title).toContain('font-size: var(--cn-board-side-heading-size, 15px);')
		expect(title).toContain('font-weight: 600;')
		expect(title).toContain('line-height: normal;')
	})

	it('starts the body 12px below the title less the first line\'s leading', () => {
		expect(bodyOf(index, `${PANEL} .cn-widget-wrapper__content`)).toContain('padding: calc(12px - var(--cn-board-first-line-leading, 0.15em)) 22px 20px;')
	})

	it('draws the header note at 13px', () => {
		expect(bodyOf(index, `${PANEL} .cn-index-page-widgets__note`)).toContain('font-size: 13px;')
	})
})

/**
 * @spec openspec/changes/board-index-side-panel-cards/specs/board-index-side-panel-cards/spec.md#requirement-a-board-record-list-table-is-the-boards-compact-grid
 */
describe('look-board-index.css: a record list table is the board\'s compact grid', () => {
	const TABLE = '.cn-look-board .cn-record-list--table .cn-record-list__table'

	it('draws a 13px regular header without a rule', () => {
		const th = bodyOf(index, `${TABLE} th`)
		expect(th).toContain('border-bottom: none;')
		expect(th).toContain('font-size: 13px;')
		expect(th).toContain('font-weight: 400;')
		expect(th).toContain('padding-block: 0 2px;')
	})

	it('draws the rows without rules at the board\'s pitch', () => {
		const td = bodyOf(index, `${TABLE} td`)
		expect(td).toContain('border-bottom: none;')
		expect(td).toContain('padding-block: 2px;')
	})
})
