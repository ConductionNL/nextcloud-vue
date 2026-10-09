/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-ref-column-labels/tasks.md#task-2
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockStore = {
	objects: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(function(slug, schema, register) { this.objectTypeRegistry[slug] = { schema, register } }),
	fetchCollectionForOptions: jest.fn(async () => [{ id: 'c1', title: 'Permit A' }, { id: 'c2', title: 'Permit B' }]),
}
jest.mock('../../src/store/useObjectStore.js', () => ({ __esModule: true, useObjectStore: () => mockStore }))

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const schema = { title: 'Task', properties: { title: { type: 'string' }, case: { type: 'string', $ref: 'case', 'x-external-register': 'dossiq' } } }
const rows = [
	{ id: 't1', title: 'One', case: 'c1' },
	{ id: 't2', title: 'Two', case: 'c1' },
	{ id: 't3', title: 'Three', case: 'c2' },
	{ id: 't4', title: 'Four', case: 'gone' },
]
const stubs = { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true }

function mountPage(columns, manifest = null) {
	return mount(CnIndexPage, {
		props: { title: 'Tasks', schema, objects: rows, columns },
		global: { stubs, mocks: { $router: { push: jest.fn() } }, provide: { cnManifest: manifest } },
	})
}

beforeEach(() => {
	mockStore.fetchCollectionForOptions.mockClear()
	mockStore.objectTypeRegistry = {}
})

describe('CnIndexPage reference column labels', () => {
	it('resolves the distinct ids in one request and renders through refLabel', async () => {
		const w = mountPage([{ key: 'title' }, { key: 'case', labelField: 'title' }])
		await flushPromises()
		expect(mockStore.fetchCollectionForOptions).toHaveBeenCalledTimes(1)
		expect(mockStore.fetchCollectionForOptions.mock.calls[0][1]._ids).toBe('c1,c2,gone')
		const col = w.vm.renderedColumns.find((c) => c.key === 'case')
		expect(col.widget).toBe('refLabel')
		expect(col.widgetProps.labels).toEqual({ c1: 'Permit A', c2: 'Permit B', gone: null })
		expect(col.sortable).toBe(false)
	})

	it('renders rows before the labels arrive', () => {
		const w = mountPage([{ key: 'case', labelField: 'title' }])
		expect(w.vm.renderedColumns[0].widgetProps.labels).toEqual({})
		expect(w.vm.displayObjects).toHaveLength(4)
	})

	it('links to the detail page the manifest declares', () => {
		const manifest = { pages: [{ id: 'CaseDetail', type: 'detail', config: { schema: 'case' } }] }
		const w = mountPage([{ key: 'case', labelField: 'title', link: true }], manifest)
		expect(w.vm.renderedColumns[0].widgetProps.route).toBe('CaseDetail')
	})

	it('leaves a plain column and a column with its own widget alone', () => {
		const cols = [{ key: 'case' }, { key: 'title', labelField: 'x' }]
		const w = mountPage(cols)
		expect(w.vm.renderedColumns).toEqual(w.vm.tableColumns)
		expect(mockStore.fetchCollectionForOptions).not.toHaveBeenCalled()
	})

	it('puts labels on the facet buckets, keeping the id as the value', async () => {
		const w = mountPage([{ key: 'case', labelField: 'title' }])
		await flushPromises()
		w.vm.$options.computed
		const facets = { case: { values: [{ value: 'c1', count: 2 }] } }
		w.vm.refLabels = { case: { c1: 'Permit A' } }
		const data = w.vm.$options.computed.effectiveFacetData.call({ storeFacets: facets, resolvedSidebar: {}, refLabelSpecs: w.vm.refLabelSpecs, refLabels: w.vm.refLabels })
		expect(data.case.values[0]).toEqual({ value: 'c1', count: 2, label: 'Permit A' })
	})

	it('lets a column opt into sorting by label', () => {
		const w = mountPage([{ key: 'case', labelField: 'title', sortByLabel: true }])
		expect(w.vm.renderedColumns[0].sortable).toBe(true)
	})
})
