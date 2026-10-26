/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The dossiq list boards put the search row 20px under the views row (live
 * 8px, so the table sat 12px high) and draw a row's action buttons 34px tall
 * (DqPostvak; live 24px). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-row-gap-and-cell-buttons/specs/board-index-row-gap-and-cell-buttons/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The body of the rule whose selector starts at `selector`. */
function body(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('board index row gap and cell buttons', () => {
	it('puts 20px between the bar rows and 8px between items', () => {
		expect(body('.cn-look-board .cn-actions-bar.cn-actions-bar--board')).toMatch(/gap: 20px 8px;/)
	})

	it('draws a row action button 34px tall', () => {
		expect(body('.cn-look-board .cn-cell-renderer__actions .button-vue')).toMatch(/--button-size: 34px;/)
	})
})
