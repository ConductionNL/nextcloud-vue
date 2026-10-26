/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqPostvak draws a row's action buttons ("Aan zaak koppelen", "Nieuwe
 * zaak") 34px tall; live drew NcButton's small 24px one. Read from the
 * stylesheet text.
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

describe('board cell action buttons', () => {
	it('draws a row action button 34px tall', () => {
		expect(body('.cn-look-board .cn-cell-renderer__actions .button-vue')).toMatch(/--button-size: 34px;/)
	})
})
