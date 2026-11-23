/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqOrganisaties: the title heading after the icon column starts over the
 * icon. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-head-over-row-icon/specs/data-table/spec.md#requirement-a-board-title-heading-starts-over-the-row-icon
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.indexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const head = '.cn-look-board .cn-table-container--board .cn-data-table th.cn-table-col--icon + th:not(.cn-look-nextcloud *)'

describe('look-board-index.css: title heading over the row icon', () => {
	it('reaches back over the blank icon heading', () => {
		expect(rule(head)).toContain('overflow: visible;')
		expect(rule(`${head} > :first-child`)).toContain('margin-inline-start: -32px;')
	})
})
