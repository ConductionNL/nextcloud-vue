/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten's side cards: the saved search's facts at a normal line
 * height 8px apart (live 21px lines made the card 31px taller), and every
 * export under a line, the 34px Download button on its own line under the
 * name and meta. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-saved-search-cards/specs/board-saved-search-cards/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The body of the rule whose selector starts at `selector`. */
function body(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('board saved search cards', () => {
	const alert = '.cn-look-board .cn-saved-view-alert:not(.cn-look-nextcloud *)'
	const exports = '.cn-look-board .cn-exports-widget:not(.cn-look-nextcloud *)'

	it('runs the saved search card at a normal line height, its parts 10px and its facts 8px apart', () => {
		expect(body(alert)).toMatch(/gap: 10px;/)
		expect(body(alert)).toMatch(/line-height: normal;/)
		expect(body(alert + ' .cn-saved-view-alert__facts')).toMatch(/gap: 8px 16px;/)
		expect(body(alert + ' .cn-saved-view-alert__switch-text')).toMatch(/font-size: 15px;/)
	})

	it('draws a line above every export and wraps the 34px button under the text', () => {
		expect(body(exports + ' .cn-exports-widget__row')).toMatch(/border-top: 1px solid var\(--color-border\);/)
		expect(body(exports + ' .cn-exports-widget__row')).toMatch(/flex-wrap: wrap;/)
		expect(body(exports + ' .cn-exports-widget__text')).toMatch(/flex: 1 1 240px;/)
		expect(body(exports + ' .button-vue')).toMatch(/--button-size: 34px;/)
	})
})
