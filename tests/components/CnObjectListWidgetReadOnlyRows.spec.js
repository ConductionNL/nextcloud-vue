/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list can show, after its own rows, rows it reads from an endpoint and
 * does not own: DqZaaktypeVelden lists the case type's own fields (editable)
 * and the fields it inherits from its parent type, read from the blueprint
 * and tagged with their origin. The inherited rows carry no row actions and
 * open no edit form.
 *
 * @spec openspec/changes/object-list-read-only-rows/specs/object-list-widget/spec.md#requirement-a-list-can-add-read-only-rows-from-an-endpoint
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => (p ? u.replace('{register}', p.register).replace('{schema}', p.schema) : u) }))
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	...jest.requireActual('../../src/composables/useEndpointSource.js'),
	fetchEndpointSource: jest.fn(),
}))

const { fetchEndpointSource } = require('../../src/composables/useEndpointSource.js')
const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const OWN = [{ id: 'f1', name: 'bouwkosten', origin: 'own' }]
const BLUEPRINT = [
	{ id: 'f1', name: 'bouwkosten', origin: 'own' },
	{ id: 'p1', name: 'locatie', origin: 'inherited', originCaseTypeTitle: 'Omgevingsvergunning' },
	{ id: 'p2', name: 'aanvrager', origin: 'inherited', originCaseTypeTitle: 'Omgevingsvergunning' },
]
const READ_ONLY = { url: '/apps/dossiq/api/case-types/@objectId/blueprint', responsePath: 'propertyDefinitions', where: { origin: ['inherited', 'shared'] } }

function mountWidget(content = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'propertyDefinition', editable: true, columns: [{ key: 'name', label: 'Field' }], ...content } },
		stubs: { CnDataTable: { props: ['rows'], template: '<div class="table"><div v-for="row in rows" :key="row.id" class="row"><slot name="row-actions" :row="row" /></div></div>' }, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true, CnRowActions: { props: ['actions', 'row'], template: '<span class="row-actions" />' } },
		provide: { cnObjectContext: { objectId: 'ct-1', object: { id: 'ct-1' } } },
		mocks: { t: (_a, s) => s },
	})
}

describe('CnObjectListWidget readOnlyRows', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: OWN, total: 1 } })
		fetchEndpointSource.mockResolvedValue(BLUEPRINT)
	})

	it('adds the matching rows after its own, tagged read only', async () => {
		const w = mountWidget({ readOnlyRows: READ_ONLY })
		await flushPromises()
		expect(fetchEndpointSource).toHaveBeenCalledWith({ url: READ_ONLY.url, responsePath: 'propertyDefinitions' }, expect.objectContaining({ objectId: 'ct-1' }))
		expect(w.vm.facetedRows.map((row) => [row.id, row._readOnly === true])).toEqual([['f1', false], ['p1', true], ['p2', true]])
	})

	it('draws row actions on its own rows only', async () => {
		const w = mountWidget({ readOnlyRows: READ_ONLY })
		await flushPromises()
		expect(w.findAll('.row')).toHaveLength(3)
		expect(w.findAll('.row-actions')).toHaveLength(1)
	})

	it('opens no edit form for a read-only row', async () => {
		const w = mountWidget({ readOnlyRows: READ_ONLY })
		await flushPromises()
		const openEdit = jest.spyOn(w.vm, 'openEdit')
		w.vm.onRowClick(w.vm.facetedRows[1])
		expect(openEdit).not.toHaveBeenCalled()
	})

	it('shows its rows without the empty state when it owns none', async () => {
		mockGet.mockResolvedValue({ data: { results: [], total: 0 } })
		const w = mountWidget({ readOnlyRows: READ_ONLY })
		await flushPromises()
		expect(w.vm.showingEmptyState).toBe(false)
		expect(w.vm.facetedRows.map((row) => row.id)).toEqual(['p1', 'p2'])
	})

	it('reads nothing extra without the option', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(fetchEndpointSource).not.toHaveBeenCalled()
		expect(w.vm.facetedRows.map((row) => row.id)).toEqual(['f1'])
	})
})
