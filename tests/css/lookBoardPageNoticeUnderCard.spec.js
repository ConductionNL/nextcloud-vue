/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page notice sits 20px under the list card (DqContracten): the body keeps
 * the card's height instead of the column's, and the notecard drops its own
 * top margin. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-page-notice-under-card/specs/board-page-notice-under-card/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The body of the rule whose selector list ends with `selector`. */
function body(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('board page notice under the list card', () => {
	it('lets the body keep the card\'s height when a page notice follows', () => {
		expect(body('.cn-look-board .cn-index-page:has(> .cn-index-page__notice--page) > .cn-index-page__body')).toMatch(/flex: none;/)
	})

	it('drops the notecard\'s own top margin', () => {
		expect(body('.cn-look-board .cn-index-page__notice--page')).toMatch(/margin-top: 0;/)
	})
})
