/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqSociaalDomein: a side row with initials keeps a 28px circle beside the
 * regular-weight text. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-side-person-rows/specs/board-side-person-rows/spec.md#requirement-a-board-side-row-with-initials-keeps-them-beside-the-text
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const row = '.cn-look-board .cn-detail-page__side .cn-record-list__row:has(> .cn-record-list__avatar):not(.cn-look-nextcloud *)'

describe('look-board-detail.css: side person rows', () => {
	it('keeps the initials beside the text, 8px apart', () => {
		const body = rule(row)
		expect(body).toContain('flex-direction: row;')
		expect(body).toContain('gap: 8px;')
	})

	it('draws a 28px circle and the text in regular weight', () => {
		expect(rule('.cn-look-board .cn-detail-page__side .cn-record-list__row:not(.cn-look-nextcloud *) > .cn-record-list__avatar')).toContain('width: 28px;')
		expect(rule(`${row} .cn-record-list__title`)).toContain('font-weight: 400;')
	})
})
