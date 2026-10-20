/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a card's body starts as far below its title as the boards
 * draw it. jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-card-title-gap/specs/board-card-title-gap/spec.md#requirement-a-board-cards-body-starts-the-boards-gap-below-its-title
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

const detail = sheet('look-board-detail.css')
const board = sheet('look-board.css')
const DASH = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--nc-dashboard)'
const LEADING = 'var(--cn-board-first-line-leading)'

describe('look-board: a card body starts the board\'s gap below its title', () => {
	it('defines the first line\'s half-leading as 0.15em', () => {
		expect(detail).toMatch(/\.cn-look-board\s*\{[^}]*--cn-board-first-line-leading:\s*0\.15em;/)
	})

	it.each([
		['a detail card', detail, '.cn-look-board .cn-detail-page .cn-widget-wrapper__title'],
		['a CnDetailCard', detail, '.cn-look-board .cn-detail-card .cn-detail-card__title'],
		['a dashboard card', board, `${DASH} .cn-widget-wrapper__title`],
	])('sets %s title at the normal line height', (_name, css, selector) => {
		expect(bodyOf(css, selector)).toContain('line-height: normal;')
	})

	it.each([
		['a detail body card', '.cn-look-board .cn-detail-page .cn-widget-wrapper__content', `calc(12px - ${LEADING}) 22px 20px`],
		['a CnDetailCard', '.cn-look-board .cn-detail-card .cn-detail-card__content', `calc(12px - ${LEADING}) 22px 20px`],
		['a detail side card', '.cn-look-board .cn-detail-page__side .cn-widget-wrapper__content', `calc(10px - ${LEADING}) 22px 20px`],
	])('pads %s by the board gap less the leading', (_name, selector, padding) => {
		expect(bodyOf(detail, selector)).toContain(`padding: ${padding};`)
	})

	it('pads a bordered dashboard card\'s header by the board gap less the leading', () => {
		expect(bodyOf(board, `${DASH}:not(.cn-widget-wrapper--borderless) .cn-widget-wrapper__header`))
			.toContain('padding: 20px var(--cn-board-dashboard-card-inset) calc(12px - var(--cn-board-first-line-leading, 0.15em));')
	})
})

/**
 * @spec openspec/changes/board-card-title-gap/specs/board-card-title-gap/spec.md#requirement-the-data-cards-grid-keeps-the-boards-gap-and-cell-padding
 */
describe('look-board-detail.css: the data card outranks the component\'s scoped rules', () => {
	it('keeps the grid\'s 12px 24px gap', () => {
		expect(bodyOf(detail, '.cn-look-board .cn-object-data-widget__grid-wrap .cn-object-data-widget__grid')).toContain('gap: 12px 24px;')
	})

	it('keeps the cell\'s padding', () => {
		expect(bodyOf(detail, '.cn-look-board .cn-object-data-widget__grid .cn-object-data-widget__cell')).toContain('padding: 0 0 10px;')
	})
})
