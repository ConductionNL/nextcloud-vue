/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqAfdelingen: the selected folder heads the list from above its card, and
 * the folder pane's filter is not repeated as an Active-line chip
 * ("group: zuiddrecht-vergunningen" on r26a).
 *
 * @spec openspec/changes/board-folder-scope-outside-card/specs/index-page/spec.md#requirement-the-selected-folder-heads-the-list-from-outside-its-card
 */
const fs = require('fs')
const path = require('path')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The Active line's chips on a board page with these filters.
 *
 * @param {object} filters The active filters.
 * @param {object|null} folderSidebar The folder pane config.
 * @return {Array<string>} The chip keys.
 */
function chips(filters, folderSidebar) {
	const ctx = {
		isBoardLook: true,
		appliedSavedView: null,
		searchTermChips: [],
		quickFilterActiveChips: [],
		effectiveActiveFilters: filters,
		folderSidebar,
		isFixedFilter: () => false,
		filterChipsOf: (map, skip) => Object.entries(map).filter(([key, value]) => !skip(key, value)).map(([key]) => key),
	}
	ctx.isFolderFilter = CnIndexPage.methods.isFolderFilter.bind(ctx)
	return CnIndexPage.computed.activeFilterChips.call(ctx)
}

describe('CnIndexPage folder scope (board look)', () => {
	it('draws no chip for the folder pane\'s filter, and keeps the others', () => {
		expect(chips({ group: ['zuiddrecht-vergunningen'], status: ['open'] }, { source: 'groups', filterField: 'group' })).toEqual(['status'])
		expect(chips({ group: ['x'] }, null)).toEqual(['group'])
	})

	it('frames the table, not the list area, when a heading heads the list', () => {
		expect(css).toMatch(/\.cn-look-board \.cn-index-page__main\.cn-index-page__main--table:has\(> \.cn-index-page__scope-heading\) \{[^}]*border: 0;[^}]*background: transparent;/)
		expect(css).toMatch(/:has\(> \.cn-index-page__scope-heading\) > \.cn-table-container\.cn-table-container--board \{[^}]*border: 1px solid var\(--color-border\);/)
		expect(css).toMatch(/:has\(> \.cn-index-page__scope-heading\) > \.cn-index-page__pagination \{[^}]*border-top: 0;/)
	})
})
