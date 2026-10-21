/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look every NcButton draws at the board's 600: the look sets
 * --font-weight-element, which NcButton reads, on each button, breadcrumb
 * buttons aside. jsdom draws no layout, so the rule is read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-button-weight/specs/board-button-weight/spec.md#requirement-a-board-button-draws-at-600
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: button weight', () => {
	it('sets --font-weight-element to 600 on a board button, crumbs aside', () => {
		const selector = '.cn-look-board .button-vue:not(.cn-look-nextcloud *):not(.vue-crumb *)'
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('--font-weight-element: 600;')
	})
})
