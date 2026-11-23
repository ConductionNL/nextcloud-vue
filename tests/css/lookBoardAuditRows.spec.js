/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look draws an audit card's rows as the boards' list rows
 * (DqHandhaving and DqTenant "Historie"): 10px above and below, a hairline
 * over every row including the first, the action and its line under it at
 * their normal line height, 2px apart. A two-line row is 56px and the first
 * line starts 21px under the card title.
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: audit card rows', () => {
	it('pads a row 10px with a hairline over it and none under it', () => {
		const body = rule('.cn-look-board .cn-audit-card__row:not(.cn-look-nextcloud *)')
		expect(body).toContain('padding: 10px 0')
		expect(body).toContain('border-top: 1px solid var(--cn-board-hairline)')
		expect(body).toContain('border-bottom: none')
	})

	it('sets the head line at its normal line height', () => {
		expect(rule('.cn-look-board .cn-audit-card__row .cn-audit-card__row-head:not(.cn-look-nextcloud *)')).toContain('line-height: normal')
	})

	it('sets the second line 2px under the head at its normal line height', () => {
		const body = rule('.cn-look-board .cn-audit-card__row .cn-audit-card__row-body:not(.cn-look-nextcloud *)')
		expect(body).toContain('margin-top: 2px')
		expect(body).toContain('line-height: normal')
	})
})
