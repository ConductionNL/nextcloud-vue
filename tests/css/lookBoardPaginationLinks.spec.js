/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards size a page link's content box at 34px: a bordered link, and
 * "Volgende", draws 36px, the borderless current page 34px (DqZaken). Read
 * from the stylesheet text.
 *
 * @spec openspec/changes/board-pagination-links/specs/board-pagination-links/spec.md#requirement-a-board-page-link-is-sized-as-the-boards-draw-it
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

describe('look-board-index.css: board page link size', () => {
	it('draws a bordered page link 36px', () => {
		const body = ruleEndingWith('.cn-look-board .cn-pagination--board .cn-pagination__board-link')
		expect(body).toMatch(/min-width: 36px;/)
		expect(body).toMatch(/\theight: 36px;/)
		expect(body).toMatch(/border: 1px solid/)
	})

	it('draws the current page 34px, without a border', () => {
		const body = ruleEndingWith('.cn-look-board .cn-pagination--board .cn-pagination__board-link--current')
		expect(body).toMatch(/min-width: 34px;/)
		expect(body).toMatch(/\theight: 34px;/)
		expect(body).toMatch(/border: 0;/)
	})
})
