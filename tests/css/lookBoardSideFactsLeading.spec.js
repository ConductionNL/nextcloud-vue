/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A side facts card sets its rows at normal line height, the first 10px
 * under the title. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-detail.css: a side facts card', () => {
	it('sets its rows at normal line height', () => {
		expect(rule('.cn-look-board .cn-detail-page__side .cn-facts-widget__rows:not(.cn-facts-widget__rows--columns) .cn-facts-widget__row')).toContain('line-height: normal;')
	})

	it('starts 10px under the title', () => {
		expect(rule('.cn-look-board .cn-detail-page__side .cn-widget-wrapper__content:has(> .cn-facts-widget > .cn-facts-widget__rows:not(.cn-facts-widget__rows--columns):first-child)')).toContain('padding-top: 10px;')
	})
})
