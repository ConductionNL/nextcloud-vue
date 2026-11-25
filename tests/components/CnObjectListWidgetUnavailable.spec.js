/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list read OpenRegister answers with a 5xx shows "Temporarily
 * unavailable" in a polite live region and reads again 60 s later; a 4xx
 * does not retry, and an unmounted widget reads nothing more.
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

function failWith(status) {
	return Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } }))
}

function mountWidget() {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 's', limit: 5 } },
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		mocks: { t: (_a, s) => s },
	})
}

describe('CnObjectListWidget on a 5xx', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		jest.spyOn(console, 'warn').mockImplementation(() => {})
		mockGet.mockReset()
	})
	afterEach(() => {
		jest.useRealTimers()
		console.warn.mockRestore()
	})

	it('says Temporarily unavailable politely and reads again after 60 s', async () => {
		mockGet.mockImplementationOnce(() => failWith(503))
			.mockImplementation(() => Promise.resolve({ data: { results: [{ id: '1' }], total: 1 } }))
		const w = mountWidget()
		await flushPromises()
		const notice = w.find('.cn-object-list-widget__error')
		expect(notice.text()).toBe('Temporarily unavailable')
		expect(notice.attributes('aria-live')).toBe('polite')
		expect(mockGet).toHaveBeenCalledTimes(1)

		jest.advanceTimersByTime(59_999)
		expect(mockGet).toHaveBeenCalledTimes(1)
		jest.advanceTimersByTime(1)
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(w.find('.cn-object-list-widget__error').exists()).toBe(false)
	})

	it('does not retry a 4xx', async () => {
		mockGet.mockImplementation(() => failWith(403))
		const w = mountWidget()
		await flushPromises()
		expect(w.find('.cn-object-list-widget__error').text()).toBe('Could not load these records')
		jest.advanceTimersByTime(120_000)
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(1)
	})

	it('reads nothing more once unmounted', async () => {
		mockGet.mockImplementation(() => failWith(500))
		const w = mountWidget()
		await flushPromises()
		w.unmount()
		jest.advanceTimersByTime(120_000)
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(1)
	})
})
