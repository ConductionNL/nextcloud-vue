/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An applied saved view does not put its own defining filter on the Active
 * line: DqFilterBeheren draws "Wacht op inwoner" as the applied view, with no
 * "Wacht op inwoner: true" chip. A filter the reader adds on top still gets
 * its chip, and so does a value that differs from the view's.
 *
 * @spec openspec/changes/applied-view-no-own-chip/specs/saved-views/spec.md
 */

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

/**
 * A board-look page context.
 *
 * @param {object} filters The active filters.
 * @param {object|null} view The applied view.
 * @return {object} The context.
 */
function page(filters, view) {
	return {
		isBoardLook: true,
		effectiveSchema: null,
		quickFilterActiveChips: [],
		effectiveActiveFilters: filters,
		isFixedFilter: () => false,
		activeFilterValueLabel: (key, value) => String(value),
		cnTranslate: (key) => key,
		appliedSavedView: view,
	}
}

const VIEW = { id: 5, name: 'Wacht op inwoner', query: { filters: { waitingOnApplicant: true } } }

describe('CnIndexPage — the Active line under an applied view', () => {
	it('names no chip for the view\'s own filter', () => {
		expect(CnIndexPage.computed.activeFilterChips.call(page({ waitingOnApplicant: true }, VIEW))).toEqual([])
	})

	it('names a filter the reader added on top', () => {
		const chips = CnIndexPage.computed.activeFilterChips.call(page({ waitingOnApplicant: true, assignedGroup: 'woo' }, VIEW))
		expect(chips.map((chip) => chip.key)).toEqual(['assignedGroup'])
	})

	it('names the filter when its value differs from the view\'s, or no view is applied', () => {
		expect(CnIndexPage.computed.activeFilterChips.call(page({ waitingOnApplicant: false }, VIEW)).map((chip) => chip.key)).toEqual(['waitingOnApplicant'])
		expect(CnIndexPage.computed.activeFilterChips.call(page({ waitingOnApplicant: true }, null)).map((chip) => chip.key)).toEqual(['waitingOnApplicant'])
	})
})
