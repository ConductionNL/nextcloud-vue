/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktype's cards as drawn: a task card without an empty grid row, the
 * versions note at normal line height, a page card's facts 12px in. Read from
 * the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} css The stylesheet.
 * @param {string} selector The selector.
 * @return {string} The body, or '' when there is none.
 */
function rule(css, selector) {
	const at = css.indexOf(`${selector} {`)
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('DqZaaktype cards in the board look', () => {
	const detail = read('look-board-detail.css')

	it('gives a task card with actions no row gap, the meta 2px under the title', () => {
		expect(rule(detail, '.cn-look-board .cn-grouped-cards__item.cn-grouped-cards__item:has(> .cn-grouped-cards__item-actions):not(.cn-look-nextcloud *)')).toContain('row-gap: 0;')
		expect(rule(detail, '.cn-look-board .cn-grouped-cards__item:has(> .cn-grouped-cards__item-actions) > .cn-grouped-cards__item-meta:not(.cn-look-nextcloud *)')).toContain('margin-top: 2px;')
	})

	it('sets the record list footer note at normal line height', () => {
		expect(rule(read('look-board.css'), '.cn-look-board .cn-record-list__footer-note:not(.cn-look-nextcloud *)')).toContain('line-height: normal;')
	})

	it('starts a page card facts list 12px in', () => {
		expect(rule(detail, '.cn-look-board .cn-detail-page .cn-widget-wrapper:not(.cn-detail-page__side *) > .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__rows:not(.cn-facts-widget__rows--columns):first-child)')).toContain('padding-top: 12px;')
	})

	it('outlines the always-available group dashed on no ground', () => {
		const body = rule(detail, '.cn-look-board .cn-grouped-cards__group.cn-grouped-cards__group--extra:not(.cn-look-nextcloud *)')
		expect(body).toContain('background: transparent;')
		expect(body).toContain('border: 1px dashed var(--color-border-maxcontrast);')
		expect(rule(detail, '.cn-look-board .cn-grouped-cards__extra-text:not(.cn-look-nextcloud *)')).toContain('font-size: 14px;')
	})
})

