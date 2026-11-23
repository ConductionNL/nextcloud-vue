/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The cases list asks its search differently per view: the board view "Zoek
 * op zaak of verzoeker" (DqWerkbord), the map "Filter op zaak of aanvrager"
 * (DqZakenKaart), the table the page's own placeholder.
 *
 * @spec openspec/changes/search-placeholder-per-view/specs/index-page/spec.md#requirement-the-search-placeholder-can-differ-per-view
 */

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const BY_VIEW = { board: 'Search by case or requester', map: 'Filter by case or applicant' }
const NL = {
	'Search by case, number or requester': 'Zoek op zaak, nummer of verzoeker',
	'Search by case or requester': 'Zoek op zaak of verzoeker',
	'Filter by case or applicant': 'Filter op zaak of aanvrager',
}

/**
 * @param {string} mode The open view.
 * @param {object|null} byView The per-view placeholders.
 * @return {string} The placeholder shown.
 */
function shown(mode, byView = BY_VIEW) {
	const ctx = {
		currentViewMode: mode,
		searchPlaceholderByView: byView,
		presented: (key) => ({ searchPlaceholder: 'Search by case, number or requester' })[key],
		cnTranslate: (text) => NL[text] || text,
	}
	return CnIndexPage.computed.shownSearchPlaceholder.call(ctx)
}

describe('the search placeholder per view', () => {
	it('asks the board and the map in their own words', () => {
		expect(shown('board')).toBe('Zoek op zaak of verzoeker')
		expect(shown('map')).toBe('Filter op zaak of aanvrager')
	})

	it('keeps the page\'s placeholder in a view it does not name, or without any', () => {
		expect(shown('table')).toBe('Zoek op zaak, nummer of verzoeker')
		expect(shown('board', null)).toBe('Zoek op zaak, nummer of verzoeker')
	})
})
