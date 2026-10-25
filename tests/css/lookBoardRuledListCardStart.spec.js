/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContact / DqOrganisatie: a ruled list in a page card starts 12px under
 * the title, its rows 12px above and below. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-ruled-list-card-start/specs/board-ruled-list-card-start/spec.md#requirement-a-board-ruled-list-in-a-page-card-starts-12px-under-the-title
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with this selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: ruled list in a page card', () => {
	it('starts the list 12px under the title', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-detail-card__content:has(> .cn-record-list--rows.cn-record-list--rule-above):not(.cn-detail-page__side *)')).toContain('padding-top: 12px;')
		expect(css).toContain('.cn-look-board .cn-detail-page .cn-widget-wrapper__content:has(> .cn-record-list--rows.cn-record-list--rule-above):not(.cn-detail-page__side *),')
	})

	it('pads each row 12px above and below', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-record-list--rows.cn-record-list--rule-above:not(.cn-detail-page__side *):not(.cn-look-nextcloud *) .cn-record-list__row')).toContain('padding: 12px 0;')
	})
})
