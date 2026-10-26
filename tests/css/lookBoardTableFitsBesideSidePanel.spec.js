/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Beside the open side panel the board look fits the case table into its
 * 760px column, titles wrapping, no sideways scroll (DqZakenSorteren,
 * DqFilterBeheren, DqFilterInMenu). On :8080 (r30) the table kept its
 * configured column widths, 1123px in a 758px scroll box. jsdom draws no
 * layout, so the rules are read as text.
 *
 * @spec openspec/changes/board-table-fits-beside-side-panel/specs/board-table-fits-beside-side-panel/spec.md#requirement-the-table-fits-its-column-beside-the-open-side-panel
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const P = '.cn-look-board .cn-index-page--sidebar-open .cn-table-container--board .cn-data-table'

/**
 * @param {string} selector The rule's selector after the scope.
 * @return {string} The rule's body, or ''.
 */
function body(selector) {
	const escaped = (P + selector).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = css.match(new RegExp(`${escaped} \\{([^}]*)\\}`))
	return match ? match[1] : ''
}

describe('the board table beside the open side panel', () => {
	it('is as wide as its column, laid out by its content', () => {
		const table = body('')
		expect(table).toContain('table-layout: auto;')
		expect(table).toContain('width: 100% !important;')
		expect(table).toContain('min-width: 0 !important;')
	})

	it('lets the configured column widths go and the cells wrap', () => {
		const cells = body(' td:not(.cn-table-col--checkbox):not(.cn-table-col--actions)')
		expect(cells).toContain('width: auto !important;')
		expect(cells).toContain('max-width: none !important;')
		expect(cells).toContain('white-space: normal;')
		expect(cells).toContain('overflow-wrap: anywhere;')
		expect(body(' td .cn-status-badge')).toContain('white-space: normal;')
	})

	it('keeps each header label and its icons on one line, unclipped', () => {
		const heads = body(' th:not(.cn-table-col--checkbox):not(.cn-table-col--actions)')
		expect(heads).toContain('width: auto !important;')
		expect(heads).toContain('white-space: nowrap;')
		expect(body(' th .cn-table-header__sort')).toContain('min-width: max-content;')
	})
})
