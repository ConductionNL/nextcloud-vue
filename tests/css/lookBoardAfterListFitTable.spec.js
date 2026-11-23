/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget table under an index list (`afterList`, PqSocial "Sociale
 * prestaties") fits its card (CnDataTable `fitWidth`): the grow column takes
 * the room left and every other column keeps its head and values on one line
 * at their own width. The index table's fixed layout reached it too, so the
 * fit's `width: 1%` columns were cut to "G...", "W...". The fixed layout is
 * the index table's own; a fit table keeps the auto layout. Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/after-list-fit-table-auto-layout/specs/narrow-object-table-widgets/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Every rule whose selector list sets `table-layout: fixed`.
 *
 * @return {string[]} The selectors.
 */
function fixedLayoutSelectors() {
	return css.split('}')
		.filter((rule) => /table-layout:\s*fixed/.test(rule))
		.flatMap((rule) => rule.split('{')[0].split(',').map((s) => s.trim()))
}

describe('look-board-index.css: a fit table under an index list', () => {
	it('keeps the index table on the fixed layout', () => {
		expect(fixedLayoutSelectors().some((s) => s.startsWith('.cn-look-board .cn-index-page__main--table .cn-table-container--board .cn-data-table'))).toBe(true)
	})

	it('never gives a fit table the fixed layout', () => {
		const index = fixedLayoutSelectors().filter((s) => s.includes('.cn-index-page__main--table'))
		for (const selector of index) {
			expect(selector).toContain(':not(.cn-data-table--fit)')
		}
	})

	it('does not size a fit table\'s title head to 18%', () => {
		const at = css.indexOf('th.cn-table-head--title {')
		const head = css.slice(css.lastIndexOf('}', at) + 1, at)
		expect(head).toContain(':not(.cn-data-table--fit)')
	})
})
