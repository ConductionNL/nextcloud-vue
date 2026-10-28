/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqLead draws the header buttons on a row under the title. With
 * `headerActionsBelow` the board header wraps: the title takes the whole
 * first row and the buttons a row of their own, from the left. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/detail-actions-below-title/specs/detail-actions-below-title/spec.md#requirement-a-detail-page-can-put-its-header-buttons-under-the-title
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-detail.css: header buttons under the title', () => {
	const header = '.cn-look-board .cn-detail-page__header--board.cn-detail-page__header--actions-below'

	it('wraps the header and gives the title the first row', () => {
		expect(ruleEndingWith(header)).toMatch(/flex-wrap: wrap;/)
		expect(ruleEndingWith(header + ' > :first-child')).toMatch(/flex: 1 1 100%;/)
	})

	it('puts the buttons on a row of their own from the left', () => {
		const actions = ruleEndingWith(header + ' .cn-detail-page__header-actions')
		expect(actions).toMatch(/flex: 1 1 100%;/)
		expect(actions).toMatch(/justify-content: flex-start;/)
	})
})
