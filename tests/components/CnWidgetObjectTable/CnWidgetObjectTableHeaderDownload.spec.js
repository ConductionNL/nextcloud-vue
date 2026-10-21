/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A page header "Download" can download a table on the page as CSV: the
 * `export` action names the table's `exportId` and the table answers
 * (board DqCatalogus "Downloaden" over the object types).
 *
 * @spec openspec/changes/header-download-table-csv/specs/header-download-table-csv/spec.md#requirement-a-header-action-can-download-a-table-on-the-page
 */

import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { shallowMount } from '@vue/test-utils'
import CnWidgetObjectTable from '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'
import { invalidateEndpointSourceCache } from '../../../src/composables/useEndpointSource.js'
import { dispatchAction } from '../../../src/utils/actionsDispatcher.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))
jest.mock('@nextcloud/event-bus', () => {
	const handlers = {}
	return {
		__esModule: true,
		subscribe: jest.fn((name, fn) => { (handlers[name] = handlers[name] || []).push(fn) }),
		unsubscribe: jest.fn((name, fn) => { handlers[name] = (handlers[name] || []).filter((h) => h !== fn) }),
		emit: jest.fn((name, payload) => { (handlers[name] || []).forEach((h) => h(payload)) }),
	}
})
jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(() => ({ objectTypeRegistry: {}, errors: {} })),
}))

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('CnWidgetObjectTable answers a header Download', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('downloads its rows when the export action names its exportId, and not for another', async () => {
		axios.get.mockResolvedValue({ data: { rows: [{ id: 'a', title: 'Boom' }] } })
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { endpointSource: { url: '/apps/app/api/types', responsePath: 'rows' }, columns: ['title'], exportId: 'object-types' } })
		await flush()
		const download = jest.spyOn(wrapper.vm, 'downloadCsv').mockImplementation(() => {})

		dispatchAction({ type: 'export', exportId: 'other' }, {})
		expect(download).not.toHaveBeenCalled()

		dispatchAction({ type: 'export', exportId: 'object-types' }, {})
		expect(download).toHaveBeenCalledTimes(1)
		expect(emit).toHaveBeenCalledWith('cn:widget:export', { exportId: 'object-types' })
	})

	it('stops listening when it is gone', async () => {
		axios.get.mockResolvedValue({ data: { rows: [] } })
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { endpointSource: { url: '/apps/app/api/types', responsePath: 'rows' }, columns: ['title'], exportId: 'object-types' } })
		await flush()
		const download = jest.spyOn(wrapper.vm, 'downloadCsv').mockImplementation(() => {})
		wrapper.unmount()
		emit('cn:widget:export', { exportId: 'object-types' })
		expect(download).not.toHaveBeenCalled()
	})
})
