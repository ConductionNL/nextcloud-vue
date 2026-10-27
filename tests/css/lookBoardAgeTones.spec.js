/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a waiting age ("6 dagen" in front of a team queue row)
 * takes the same error and warning inks as a card's deadline: board
 * DqTeamwachtrij draws it #a30000, live drew the theme's brighter
 * --color-text-error (rgb 213, 43, 30). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-list-lead-cell/specs/board-list-lead-cell/spec.md#requirement-a-board-list-rows-leading-cell-is-14px-bold
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

describe('look-board-index.css: waiting age tones', () => {
	it('draws an overdue age in the error ink of a card deadline', () => {
		expect(ruleEndingWith('.cn-look-board .cn-cell-renderer__age--error:not(.cn-look-nextcloud *)')).toMatch(/color: var\(--color-error-text\);/)
	})

	it('draws a nearly due age in the warning ink of a card deadline', () => {
		expect(ruleEndingWith('.cn-look-board .cn-cell-renderer__age--warning:not(.cn-look-nextcloud *)')).toMatch(/color: var\(--color-warning-text\);/)
	})
})
