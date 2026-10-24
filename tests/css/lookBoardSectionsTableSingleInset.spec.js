/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget table inside a sections widget on a board dashboard card is inset
 * once, by the sections body (DqTermijnen Kwartaalrapport: 1074px, live drew
 * 1024px with the table inset added a second time). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-sections-table-single-inset/specs/board-sections-table-single-inset/spec.md#requirement-a-table-inside-a-dashboard-sections-card-is-inset-once
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: a table inside a dashboard sections card', () => {
	it('takes no inset of its own', () => {
		const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-sections-widget--grid .cn-widget-object-table {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at - 200, at)).toContain('.cn-sections-widget--plain .cn-widget-object-table,')
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding: 0;')
		// After the dashboard table inset, so it wins at equal weight plus one class.
		const inset = css.indexOf('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-widget-object-table {')
		expect(inset).toBeGreaterThan(-1)
		expect(at).toBeGreaterThan(inset)
	})

	it('gives a record list there no side inset of its own either', () => {
		const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-sections-widget--grid .cn-record-list {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at - 200, at)).toContain('.cn-sections-widget--plain .cn-record-list,')
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding-inline: 0;')
		expect(at).toBeGreaterThan(css.indexOf('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list {'))
	})
})
