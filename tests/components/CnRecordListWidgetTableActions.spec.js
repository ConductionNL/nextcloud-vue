/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget `presentation: "table"` with a second line per cell and
 * an actions menu per row: board OrArchivering's destruction lists.
 *
 * @spec openspec/changes/record-list-table-row-actions/specs/record-list-table/spec.md#requirement-a-table-row-can-carry-a-second-line-and-an-actions-menu
 */
var mockGet = jest.fn()
var mockRequest = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), request: (...a) => mockRequest(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const LISTS = [
	{ uuid: 'l-1', title: 'Destruction list 2026-Q3 Reports', summary: '1204 records', createdByName: 'Pieter Jansen', status: 'in_review', statusLabel: 'Awaiting approval' },
	{ uuid: 'l-2', title: 'Destruction list 2026-Q2 Reports', summary: '', createdByName: 'Pieter Jansen', status: 'completed', statusLabel: 'Destroyed' },
]

const CONTENT = {
	endpointSource: { url: '/apps/openregister/api/archival/overview', responsePath: 'destructionLists' },
	presentation: 'table',
	columns: [
		{ label: 'List', value: '{title}', sub: '{summary}' },
		{ label: 'Drawn up by', value: '{createdByName}' },
		{ label: 'Status', value: '{statusLabel}' },
	],
	rowActionsLabel: 'Actions for this list',
	rowActions: [
		{ label: 'Approve', endpoint: '/apps/openregister/api/archival/destruction-lists/{uuid}/approve', visibleWhen: { field: 'status', value: 'in_review' } },
		{ label: 'Reject', endpoint: '/apps/openregister/api/archival/destruction-lists/{uuid}/reject', visibleWhen: { field: 'status', value: 'in_review' } },
	],
}

const stubs = {
	NcActions: { props: ['ariaLabel'], template: '<div data-actions :aria-label="ariaLabel"><slot /></div>' },
	NcActionButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcLoadingIcon: true,
}

beforeEach(() => {
	invalidateEndpointSourceCache()
	mockGet.mockReset()
	mockRequest.mockReset()
	mockGet.mockResolvedValue({ data: { destructionLists: LISTS } })
	mockRequest.mockResolvedValue({ data: {} })
})

describe('CnRecordListWidget table row actions', () => {
	it('draws the second line under a cell and an Actions column', async () => {
		const w = mount(CnRecordListWidget, { props: { content: CONTENT }, global: { stubs } })
		await flush()

		expect(w.findAll('th').map((th) => th.text())).toEqual(['List', 'Drawn up by', 'Status', 'Actions'])
		const rows = w.findAll('tbody tr')
		const first = rows[0].findAll('td')
		expect(first[0].find('.cn-record-list__cell-text').text()).toBe('Destruction list 2026-Q3 Reports')
		expect(first[0].find('.cn-record-list__cell-sub').text()).toBe('1204 records')
		expect(rows[1].findAll('td')[0].find('.cn-record-list__cell-sub').exists()).toBe(false)
	})

	it('offers a row only the actions that hold for it, and calls the row url', async () => {
		const w = mount(CnRecordListWidget, { props: { content: CONTENT }, global: { stubs } })
		await flush()

		const rows = w.findAll('tbody tr')
		const menu = rows[0].find('[data-actions]')
		expect(menu.attributes('aria-label')).toBe('Actions for this list')
		expect(menu.findAll('button').map((b) => b.text())).toEqual(['Approve', 'Reject'])
		expect(rows[1].find('[data-actions]').exists()).toBe(false)
		expect(rows[1].findAll('td')).toHaveLength(4)

		await menu.findAll('button')[0].trigger('click')
		await flush()
		expect(mockRequest).toHaveBeenCalledWith({ method: 'post', url: '/nc/apps/openregister/api/archival/destruction-lists/l-1/approve' })
	})

	it('names the actions column after rowActionsHeader', async () => {
		const w = mount(CnRecordListWidget, { props: { content: { ...CONTENT, rowActionsHeader: 'Do' } }, global: { stubs } })
		await flush()
		expect(w.findAll('th').map((th) => th.text()).pop()).toBe('Do')
	})
})
