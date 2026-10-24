import { MISSING_VALUE } from '../../src/utils/facets.js'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view's filters as one readable line, as the board's menu settings
 * row reads it: "Zaaktype Woo-verzoek, status open".
 *
 * @spec openspec/changes/saved-view-menu-settings/specs/saved-view-menu-settings/spec.md#requirement-a-menu-entry-says-what-its-view-shows-and-how-many
 */
import { summarizeViewFilters, viewFilterReferences } from '../../src/utils/savedViewSummary.js'

const PROPERTIES = {
	caseType: { type: 'string', title: 'Case type', $ref: 'caseType' },
	status: { type: 'string', title: 'Status', oneOf: [{ const: 'open', title: 'Open' }, { const: 'closed', title: 'Closed' }] },
	priority: { type: 'string', title: 'Priority', 'x-enum-labels': { high: 'High' } },
	urgent: { type: 'boolean', title: 'Urgent' },
	deadline: { type: 'string', title: 'Deadline' },
	bsn: { type: 'string', title: 'BSN' },
}

const NL = { 'Case type': 'Zaaktype', Status: 'Status', Open: 'open' }
const translate = (text) => NL[text] || text

describe('summarizeViewFilters', () => {
	it('names each filter by its field title and its values by their display names, in sentence case', () => {
		const line = summarizeViewFilters(
			{ filters: { caseType: ['woo-uuid'], status: 'open' } },
			{ properties: PROPERTIES, valueLabels: { caseType: { 'woo-uuid': 'Woo-verzoek' } }, translate },
		)
		expect(line).toBe('Zaaktype Woo-verzoek, status open')
	})

	it('reads x-enum-labels, booleans, ranges, a missing value and a search term', () => {
		const line = summarizeViewFilters({
			filters: { priority: 'high', urgent: true, deadline: { gte: '2026-10-01' }, status: [MISSING_VALUE] },
			search: 'parkeren',
		}, { properties: PROPERTIES })
		expect(line).toBe('Priority High, urgent yes, deadline from 2026-10-01, status no value, "parkeren"')
	})

	it('joins several values with "or", keeps an abbreviation in capitals and falls back to the raw value and key', () => {
		const line = summarizeViewFilters({ filters: { status: ['open', 'closed'], bsn: '123', other: 'x' } }, { properties: PROPERTIES })
		expect(line).toBe('Status Open or Closed, BSN 123, other x')
	})

	it('is empty for a view without filters or search', () => {
		expect(summarizeViewFilters({ filters: {}, search: '' })).toBe('')
		expect(summarizeViewFilters(null)).toBe('')
	})
})

describe('summarizeViewFilters with the page\'s filterLabels', () => {
	const filterLabels = {
		statusHiddenInLists: { hidden: true },
		isDraft: { hidden: true },
		isFinalStatus: { label: 'Status', values: { false: 'ongoing' } },
	}

	it('leaves out the filters the page marks hidden, as working-list rules nobody chose', () => {
		const line = summarizeViewFilters(
			{ filters: { caseType: ['woo-uuid'], statusHiddenInLists: false, isDraft: false } },
			{ properties: PROPERTIES, valueLabels: { caseType: { 'woo-uuid': 'Woo-verzoek' } }, filterLabels, translate },
		)
		expect(line).toBe('Zaaktype Woo-verzoek')
	})

	it('names a filter and its value as the Active line does, before the schema', () => {
		const line = summarizeViewFilters(
			{ filters: { isFinalStatus: false } },
			{ properties: { isFinalStatus: { type: 'boolean', title: 'Is final status' } }, filterLabels },
		)
		expect(line).toBe('Status ongoing')
	})

	it('is empty for a view that only holds hidden filters', () => {
		expect(summarizeViewFilters({ filters: { isDraft: false } }, { filterLabels })).toBe('')
	})
})

describe('viewFilterReferences', () => {
	it('lists the ids per reference filter, for a label lookup', () => {
		const fields = [
			{ key: 'caseType', reference: { schema: 'caseType', register: 'catalogue', labelField: 'title' } },
			{ key: 'status', reference: null },
		]
		expect(viewFilterReferences({ filters: { caseType: ['a', 'b'], status: 'open' } }, fields))
			.toEqual([{ key: 'caseType', register: 'catalogue', schema: 'caseType', labelField: 'title', ids: ['a', 'b'] }])
	})
})

/**
 * @spec openspec/changes/saved-view-summary-match-field-labels/specs/saved-view-menu-settings/spec.md#requirement-a-filter-on-a-records-identifier-reads-as-the-records-name
 */
describe('viewFilterReferences from the page\'s filterLabels', () => {
	it('lists a filter whose filterLabels entry names the record it identifies, with the field it matches on', () => {
		const filterLabels = { caseTypeIdentifier: { label: 'Case type', reference: { register: 'dossiq', schema: 'caseType', matchField: 'identifier', labelField: 'title' } } }
		expect(viewFilterReferences({ filters: { caseTypeIdentifier: 'woo-verzoek', isDraft: false } }, [], filterLabels))
			.toEqual([{ key: 'caseTypeIdentifier', register: 'dossiq', schema: 'caseType', labelField: 'title', matchField: 'identifier', ids: ['woo-verzoek'] }])
	})

	it('reads the looked-up name in the line, under the filterLabels title', () => {
		const filterLabels = { caseTypeIdentifier: { label: 'Case type' } }
		expect(summarizeViewFilters({ filters: { caseTypeIdentifier: 'woo-verzoek' } }, {
			filterLabels,
			valueLabels: { caseTypeIdentifier: { 'woo-verzoek': 'Woo-verzoek' } },
			translate,
		})).toBe('Zaaktype Woo-verzoek')
	})
})

