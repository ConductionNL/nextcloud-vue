/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column's `toggle` makes its cell a switch (or checkbox) that sends the new
 * state to an app endpoint: DqZaaktypeVelden "In de lijst" ticks a field into
 * the case type's case list. With `updatesRecord` the endpoint answers the
 * page's record, which the page takes over, and the toggle is offered only
 * while the record can be edited.
 *
 * @spec openspec/changes/cell-toggle-request/specs/object-list-widget/spec.md#requirement-a-column-can-toggle-a-value-through-an-endpoint
 */
import { shallowMount } from '@vue/test-utils'

const mockPut = jest.fn()
const mockPost = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: () => Promise.resolve({ data: { results: [], total: 0 } }), put: (...a) => mockPut(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => `/index.php${u}` }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const TOGGLE = {
	url: '/apps/dossiq/api/case-types/@objectId/list-columns/{name}',
	method: 'PUT',
	bodyKey: 'shown',
	ariaLabel: 'Show {label} in the list',
	labelFormatter: 'fieldTitle',
	updatesRecord: true,
}

function mountWidget({ toggle = TOGGLE, recordEdit = { available: true }, setObject = jest.fn() } = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: {
			content: {
				register: 'dossiq',
				schema: 'propertyDefinition',
				columns: [{ key: 'name', label: 'Field' }, { key: 'name', label: 'In the list', formatter: 'inList', widgetProps: { type: 'checkbox' }, toggle }],
			},
		},
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		provide: {
			cnObjectContext: { objectId: 'ct-1', object: { id: 'ct-1' }, setObject },
			cnRecordEdit: recordEdit,
			cnFormatters: { fieldTitle: (value, row) => row.title },
		},
		mocks: { t: (_a, s) => s },
	})
}

describe('CnObjectListWidget column toggle', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('draws the column as a switch cell with the declared look', () => {
		const column = mountWidget().vm.resolvedColumns[1]
		expect(column.widget).toBe('switch')
		expect(column.widgetProps.type).toBe('checkbox')
		expect(typeof column.widgetProps.onToggle).toBe('function')
	})

	it('names each checkbox after its row', () => {
		const column = mountWidget().vm.resolvedColumns[1]
		expect(column.widgetProps.ariaLabel({ name: 'welstandsgebied', title: 'Welstandsgebied' })).toBe('Show Welstandsgebied in the list')
	})

	it('sends the new state to the endpoint, the page and row filled in', async () => {
		mockPut.mockResolvedValue({ data: { id: 'ct-1', 'x-index': { columns: ['welstandsgebied'] } } })
		const setObject = jest.fn()
		const column = mountWidget({ setObject }).vm.resolvedColumns[1]
		await column.widgetProps.onToggle({ name: 'welstandsgebied' }, true)
		expect(mockPut).toHaveBeenCalledWith('/index.php/apps/dossiq/api/case-types/ct-1/list-columns/welstandsgebied', { shown: true })
		expect(setObject).toHaveBeenCalledWith({ id: 'ct-1', 'x-index': { columns: ['welstandsgebied'] } })
	})

	it('lets a refused write reach the cell, which puts the checkbox back', async () => {
		mockPut.mockRejectedValue(new Error('403'))
		const setObject = jest.fn()
		const column = mountWidget({ setObject }).vm.resolvedColumns[1]
		await expect(column.widgetProps.onToggle({ name: 'welstandsgebied' }, false)).rejects.toThrow('403')
		expect(setObject).not.toHaveBeenCalled()
	})

	it('offers no toggle while the page record cannot be edited', () => {
		const column = mountWidget({ recordEdit: { available: false } }).vm.resolvedColumns[1]
		expect(column.widget).toBe('switch')
		expect(column.widgetProps.onToggle).toBeUndefined()
		expect(column.widgetProps.ariaLabel({ name: 'x', title: 'X' })).toBe('Show X in the list')
	})

	it('posts when the toggle says so and leaves the record alone without updatesRecord', async () => {
		mockPost.mockResolvedValue({ data: { id: 'other' } })
		const setObject = jest.fn()
		const column = mountWidget({ toggle: { url: '/apps/x/api/flags/{name}', method: 'POST' }, setObject }).vm.resolvedColumns[1]
		await column.widgetProps.onToggle({ name: 'a' }, true)
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/x/api/flags/a', { value: true })
		expect(setObject).not.toHaveBeenCalled()
	})
})
