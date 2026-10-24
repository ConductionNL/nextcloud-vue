/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The edit dialog's criteria sentences (DqFilterBewerken) read the page's
 * `filterLabels` as the side panel and the Active line do: a filter marked
 * `hidden` (a working-list rule every view carries) is left out, and a
 * filter's `label` and `values` name it.
 *
 * @spec openspec/changes/criteria-summary-reads-filter-labels/specs/criteria-summary-reads-filter-labels/spec.md
 */
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const page = {
	effectiveSchema: { properties: { statusHiddenInLists: { title: 'Status hidden in lists' }, waitingOnApplicant: { title: 'Waiting on applicant' }, deadline: { title: 'Deadline' } } },
	filterLabels: {
		statusHiddenInLists: { hidden: true },
		waitingOnApplicant: { label: 'Status', values: { true: 'waiting on the applicant' } },
	},
	cnTranslate: (text) => text,
}

describe('CnIndexPage criteriaSummaryOf', () => {
	it('leaves hidden filters out and names a filter by its filterLabels', () => {
		const text = CnIndexPage.methods.criteriaSummaryOf.call(page, {
			filters: { waitingOnApplicant: true, statusHiddenInLists: false },
			sortKeys: [{ key: 'deadline', order: 'asc' }],
		})
		expect(text).toBe('Status waiting on the applicant. Sorted by deadline, ascending.')
	})
})
