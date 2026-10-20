/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw the selected quick-filter chip without a border (DqZaken
 * "Alles 48": border 0, padding 14) and a chip's count as a 16px bubble: a
 * 12px figure at the font's normal line height with 1px of padding. The
 * selected chip kept a transparent 1px border and the count a 1.4 line
 * height (18.8px). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-quick-filter-chip-box/specs/board-quick-filter-chip-box/spec.md#requirement-board-quick-filter-chips-take-the-boards-box
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

describe('look-board-index.css: quick-filter chip box', () => {
	it('draws the selected chip without a border', () => {
		const rule = ruleEndingWith('.cn-look-board .cn-quick-filter-bar .cn-quick-filter-bar__tab--active:hover')
		expect(rule).toMatch(/border: 0;/)
		expect(rule).not.toContain('border-color: transparent')
	})

	it('sets the count at the normal line height', () => {
		expect(ruleEndingWith('.cn-look-board .cn-quick-filter-bar .cn-quick-filter-bar__count'))
			.toMatch(/line-height: normal;/)
	})
})
