/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page card's field list draws its rows at normal line height, title and
 * meta 2px apart, the first row 10px in. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const LIST = '.cn-look-board .cn-detail-page .cn-field-list-widget__rows:not(.cn-field-list-widget__rows--options):not(.cn-detail-page__side *)'

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when there is none.
 */
function rule(selector) {
	const at = css.indexOf(`${selector} {`)
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: a page card field list', () => {
	it('sets its rows at normal line height, the first 10px in', () => {
		expect(rule(`${LIST} .cn-field-list-widget__row`)).toContain('line-height: normal;')
		expect(rule(`${LIST} .cn-field-list-widget__row:first-child`)).toContain('padding-top: 10px;')
	})

	it('sets title and meta 2px apart', () => {
		expect(rule(`${LIST} .cn-field-list-widget__main`)).toContain('gap: 2px;')
	})
})
