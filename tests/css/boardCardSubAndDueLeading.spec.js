/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a kanban card's number line and its footer at the font's
 * normal line height (DqWerkbord: 15px for 13px). Without it both took
 * Nextcloud's 1.5 leading and the card stood 9px taller. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-card-sub-and-due-leading/specs/board-card-sub-and-due-leading/spec.md#requirement-a-kanban-cards-number-line-and-footer-read-at-normal-leading
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

describe('board.css: kanban card number line and footer leading', () => {
	it('sets the number line at the normal line height', () => {
		expect(ruleEndingWith('.cn-board-view.cn-board-view--board .cn-board-view__card-sub'))
			.toMatch(/line-height: normal;/)
	})

	it('sets the footer at the normal line height', () => {
		expect(ruleEndingWith('.cn-board-view.cn-board-view--board .cn-board-view__card-footer'))
			.toMatch(/line-height: normal;/)
	})
})
