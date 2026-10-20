/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board toolbar's search field is 40px and its Filter button draws the
 * board control border, under Nextcloud's input rule and a theme's secondary
 * button border (DqContacten). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-toolbar-controls/specs/board-index-toolbar-controls/spec.md#requirement-the-search-field-is-40px-under-nextclouds-input-rule
 * @spec openspec/changes/board-index-toolbar-controls/specs/board-index-toolbar-controls/spec.md#requirement-the-filter-button-draws-the-control-border
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with the given selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleEndingWith(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: board toolbar controls', () => {
	it('sets the search field to 40px with a selector that outranks Nextcloud\'s input rule', () => {
		const nots = ['radio', 'checkbox', 'range', 'submit', 'button', 'reset', 'color', 'file', 'image']
			.map((type) => `:not([type='${type}'])`).join('')
		const selector = `.cn-look-board .cn-actions-bar--board .cn-actions-bar__search input.cn-actions-bar__search-input${nots}`
		const rule = ruleEndingWith(selector)
		expect(rule).toMatch(/(^|[\s;{])height: 40px;/)
		expect(rule).toMatch(/min-height: 40px;/)
		// (0,12,1) against Nextcloud's input rule at (0,9,1).
		const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]/g) || []).length
		expect(classes).toBeGreaterThan(9)
	})

	it('needs no !important for the search field', () => {
		expect(css).not.toMatch(/cn-actions-bar__search-input[^{]*\{[^}]*height: 40px !important/)
	})

	it('draws the Filter button with the board control border', () => {
		expect(ruleEndingWith('.cn-look-board .cn-actions-bar__filter-menu .button-vue'))
			.toMatch(/border: 1px solid var\(--cn-board-control-border\);/)
	})
})
