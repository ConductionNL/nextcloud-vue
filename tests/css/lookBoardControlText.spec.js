/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a button's text is 14px: the look sets
 * --default-font-size, which NcButton reads its size from, on each button,
 * breadcrumb buttons aside. A surface that sets its own `font-size` keeps it.
 * jsdom draws no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-control-text/specs/board-control-text/spec.md#requirement-a-board-button-draws-its-text-at-14px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: control text', () => {
	it('sets --default-font-size to 14px on a board button, crumbs aside', () => {
		const selector = '.cn-look-board .button-vue:not(.cn-look-nextcloud *):not(.vue-crumb *)'
		const at = css.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('--default-font-size: 14px;')
	})

	it('leaves the Nextcloud look alone: the variable is set nowhere outside the board look', () => {
		const rules = css.split('}').filter((rule) => rule.includes('--default-font-size:'))
		expect(rules.length).toBeGreaterThan(0)
		rules.forEach((rule) => expect(rule.split('{')[0]).toContain('.cn-look-board'))
	})
})
