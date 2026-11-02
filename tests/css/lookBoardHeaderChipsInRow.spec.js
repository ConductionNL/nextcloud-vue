/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTenant: the slug pill sits in the header's second row on the row's own
 * line, so the chips list drops the 6px top margin it keeps under the title
 * outside the board look (r44: header 85 vs 79, subtitle gap 16 vs 13). jsdom
 * draws no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-header-chips-after-breadcrumb/specs/detail-page-board-look/spec.md#requirement-board-header-chips-follow-the-breadcrumb
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

describe('look-board-detail.css: header chips in row 2', () => {
	it('drops the chips list margin in the board header row', () => {
		expect(rule('.cn-look-board .cn-detail-page__header-row2 .cn-detail-header-chips.cn-detail-header-chips')).toContain('margin: 0;')
	})
})
