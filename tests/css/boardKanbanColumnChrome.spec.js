/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a kanban column's heading at the font's normal line height
 * (18px) and a cut column's "Toon 12 meer" as a dashed 13px button
 * (DqWerkbord); the count's 16px at 700 is board-pill-tones'. Nextcloud's
 * `button:not(.button-vue)` rule outranked the single-class show-more rule
 * and drew it borderless, primary-tinted, bold and 15px. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-kanban-column-chrome/specs/board-kanban-column-chrome/spec.md#requirement-a-kanban-column-has-the-boards-heading-count-and-show-more
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('board.css: kanban column chrome', () => {
	it('sets the board heading at the normal line height', () => {
		expect(ruleEndingWith('.cn-board-view.cn-board-view--board .cn-board-view__column-header--board'))
			.toMatch(/line-height: normal;/)
	})

	it('keeps the count on a 14px line at 700', () => {
		const rule = ruleEndingWith('.cn-board-view.cn-board-view--board .cn-board-view__badge')
		expect(rule).toMatch(/font-weight: 700;/)
		expect(rule).toMatch(/line-height: 14px;/)
	})

	it('scopes the show-more button under the board so it outranks the server button rule', () => {
		const rule = ruleEndingWith('.cn-board-view .cn-board-view__show-more')
		expect(rule).toMatch(/border: 1px dashed/)
		expect(rule).toMatch(/font-size: 13px;/)
		expect(css).not.toMatch(/(^|\n)\.cn-board-view__show-more \{/)
	})
})
