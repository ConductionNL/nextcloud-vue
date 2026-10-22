/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The settings table (CnWidgetObjectTable) and the detail list
 * (CnObjectListWidget) can draw the index table's column heads: a sort button
 * and a column filter, opt-in. The boards draw them in DqInstellingen
 * ("Koppeling", "Bron"), DqVthInstellingen ("DSO-activiteit", "Regel") and
 * DqZaakContact ("Datum", "Kanaal"); live drew a plain label. A header sort or
 * filter goes out with the widget's own fetch.
 *
 * @spec openspec/changes/table-widget-header-controls/specs/table-widget-header-controls/spec.md
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p && p.register).replace('{schema}', p && p.schema) }))

const CnWidgetObjectTable = require('../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default
const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const COLUMNS = [{ key: 'title', label: 'Connection' }, { key: 'source', label: 'Source' }, { key: 'status', label: 'Status', sortable: false }]

function mountTable(props = {}) {
	return shallowMount(CnWidgetObjectTable, {
		propsData: { source: { register: 'dossiq', schema: 'connection', order: { title: 'asc' } }, columns: COLUMNS, hideWrapper: true, ...props },
		stubs: { CnDataTable: true },
		mocks: { t: (_a, s) => s },
	})
}

const table = (w) => w.findComponent({ name: 'CnDataTable' })

describe('CnWidgetObjectTable header controls', () => {
	it('stays a plain head without the options', () => {
		const t = table(mountTable())
		expect(t.props('filterable')).toBe(false)
		expect(t.props('columns').some((c) => c.sortable === true)).toBe(false)
	})

	it('makes every column sortable that does not say otherwise, and filterable', () => {
		const t = table(mountTable({ sortable: true, filterable: true }))
		expect(t.props('columns').map((c) => c.sortable)).toEqual([true, true, false])
		expect(t.props('filterable')).toBe(true)
	})

	it('sends a header sort and a header filter with its own fetch', async () => {
		const w = mountTable({ sortable: true, filterable: true })
		table(w).vm.$emit('sort', { key: 'source', order: 'desc' })
		table(w).vm.$emit('column-filter', { key: 'title', params: { 'title[like]': ['zaak'] } })
		await w.vm.$nextTick()
		const params = table(w).props('fetchParams')
		expect(params['_order[source]']).toBe('desc')
		expect(params['_order[title]']).toBeUndefined()
		expect(params['title[like]']).toBe('zaak')
		expect(table(w).props('sortKey')).toBe('source')
		expect(table(w).props('sortOrder')).toBe('desc')
		expect(table(w).props('activeFilters')).toEqual({ 'title[like]': ['zaak'] })

		table(w).vm.$emit('column-filter', { key: 'title', params: { 'title[like]': [] } })
		await w.vm.$nextTick()
		expect(table(w).props('fetchParams')['title[like]']).toBeUndefined()
	})
})

describe('CnObjectListWidget header filters', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', summary: 'Gebeld met de verzoeker' }], total: 1 } })
	})

	function mountList(content = {}) {
		return shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'dossiq', schema: 'contactmoment', columns: [{ key: 'summary', label: 'Summary' }], ...content } },
			stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true, CnRowActions: true },
			mocks: { t: (_a, s) => s },
		})
	}

	it('is filterable only when asked', async () => {
		const w = mountList()
		await flushPromises()
		expect(w.findComponent({ name: 'CnDataTable' }).props('filterable')).toBe(false)
	})

	it('fetches again with a header filter', async () => {
		const w = mountList({ filterable: true, sortable: true })
		await flushPromises()
		const t = w.findComponent({ name: 'CnDataTable' })
		expect(t.props('filterable')).toBe(true)
		t.vm.$emit('column-filter', { key: 'summary', params: { 'summary[like]': ['gebeld'] } })
		await flushPromises()
		const params = mockGet.mock.calls[mockGet.mock.calls.length - 1][1].params
		expect(params['summary[like]']).toBe('gebeld')
		expect(w.findComponent({ name: 'CnDataTable' }).props('activeFilters')).toEqual({ 'summary[like]': ['gebeld'] })
	})
})
