/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A filter menu entry needs no column behind it (`filterMenuFields`): PqContracten
 * filters on its owner, which the board draws no column for, and PqFlows on the
 * flow's owner. The values come from the API's facets or the named source's, and
 * read as the Active chip names them: a user by display name, not by uid.
 */
jest.mock('../../src/composables/useFlowStore.js', () => {
	const s = { flows: [], runSummary: {}, eventCatalog: [], loading: false, load: jest.fn(), loadRunSummary: jest.fn() }
	return { useFlowStore: () => s, __store: s }
})
jest.mock('../../src/utils/userDisplayName.js', () => ({
	userDisplayName: (uid) => ({ 'pieter.jansen': 'Pieter Jansen' })[uid] || '',
}))

const { indexSources } = require('../../src/composables/indexSources.js')
const { __store: store } = require('../../src/composables/useFlowStore.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

/**
 * @param {object} own The page state.
 * @return {object} A page-like `this` with CnIndexPage's methods.
 */
function page(own = {}) {
	const vm = {
		filterLabels: {},
		filterMenuFields: [],
		effectiveSchema: { properties: {} },
		effectiveFacetData: {},
		refLabels: {},
		sidebar: null,
		sourceConfig: null,
		columns: [],
		tableColumns: [],
		isNamedSource: false,
		namedSource: null,
		cnTranslate: (key) => key,
		...own,
	}
	for (const [name, fn] of Object.entries(CnIndexPage.methods)) {
		vm[name] = fn.bind(vm)
	}
	return vm
}

describe('a filter menu entry without a column', () => {
	it('offers the API facet buckets, named by the user\'s display name', () => {
		const vm = page({
			filterMenuFields: [{ key: 'ownerId', label: 'Owner', referenceType: 'nextcloud-user' }],
			effectiveFacetData: { ownerId: { values: [{ value: 'pieter.jansen', count: 4 }, { value: 'anouk.bakker', count: 2 }] } },
		})
		const fields = CnIndexPage.computed.filterableFields.call(vm)
		expect(fields).toEqual([{ key: 'ownerId', label: 'Owner', values: ['pieter.jansen', 'anouk.bakker'] }])
		expect(vm.activeFilterValueLabel('ownerId', 'pieter.jansen')).toBe('Pieter Jansen')
		expect(vm.activeFilterValueLabel('ownerId', 'anouk.bakker')).toBe('anouk.bakker')
	})

	it('prefers its own values, then the schema enum', () => {
		expect(page().filterMenuValuesOf({ key: 'x', values: ['a', 'b'] })).toEqual(['a', 'b'])
		const vm = page({ effectiveSchema: { properties: { kind: { enum: ['lead', 'client'] } } } })
		expect(vm.filterMenuValuesOf({ key: 'kind' })).toEqual(['lead', 'client'])
	})

	it('leaves out an entry with no values, and one a column already offers', () => {
		const vm = page({
			filterMenuFields: [{ key: 'ownerId' }, { key: 'status', values: ['open'] }],
			tableColumns: [{ key: 'status', label: 'Status', enum: ['open', 'closed'] }],
		})
		expect(CnIndexPage.computed.filterableFields.call(vm)).toEqual([{ key: 'status', label: 'Status', values: ['open', 'closed'] }])
	})

	it('reads a named source\'s facets', () => {
		store.flows = [{ id: '1', owner: 'pieter.jansen' }, { id: '2', owner: 'pieter.jansen' }, { id: '3', owner: 'anouk.bakker' }, { id: '4', owner: null }]
		const vm = page({ isNamedSource: true, namedSource: indexSources.flows() })
		expect(vm.filterMenuValuesOf({ key: 'owner' })).toEqual(['pieter.jansen', 'anouk.bakker'])
	})
})

describe('the flows source', () => {
	beforeEach(() => {
		store.flows = [
			{ id: '1', name: 'A', owner: 'pieter.jansen', enabled: true },
			{ id: '2', name: 'B', owner: 'anouk.bakker', enabled: true },
			{ id: '3', name: 'C', owner: 'pieter.jansen', enabled: false },
		]
	})

	it('declares owner as an argument and counts the owners', () => {
		const source = indexSources.flows()
		expect(source.searchFields.owner).toEqual({ param: 'owner' })
		expect(source.facets().owner).toEqual([{ value: 'pieter.jansen', count: 2 }, { value: 'anouk.bakker', count: 1 }])
	})

	it('narrows its rows to the chosen owners, within the tab', async () => {
		const source = indexSources.flows()
		await source.load({ owner: ['pieter.jansen'] })
		expect(source.rows().map((row) => row.id)).toEqual(['1', '3'])
		await source.load({ owner: ['pieter.jansen'], state: 'active' })
		expect(source.rows().map((row) => row.id)).toEqual(['1'])
		await source.load({})
		expect(source.rows()).toHaveLength(3)
	})
})
