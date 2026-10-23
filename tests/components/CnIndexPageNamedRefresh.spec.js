/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Refresh in the header's Actions menu reads a named source again (DqPostvak's
 * inbox, an endpoint source). It used to reload only a register list, so on a
 * named-source page the entry did nothing.
 *
 * @spec openspec/changes/named-source-refresh/specs/index-page/spec.md#requirement-refresh-reads-a-named-source-again
 */
var mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}`, generateOcsUrl: (url) => url }))

const { flushPromises, mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: [{ id: '1', subject: 'Vraag' }] } })
})

describe('Refresh on a named-source page', () => {
	it('reads the source again', async () => {
		const $route = { query: {}, params: {}, path: '/postvak' }
		const $router = { replace: jest.fn(() => Promise.resolve()), push: jest.fn() }
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Inbox', entitySource: 'endpoint', sourceConfig: { url: '/apps/x/api/inbox' }, columns: [{ key: 'subject', label: 'Subject' }] },
			global: { mocks: { $route, $router } },
			mocks: { $route, $router },
			stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
		})
		await flushPromises()
		const before = mockGet.mock.calls.length
		expect(before).toBeGreaterThan(0)
		await wrapper.vm.onRefreshEvent()
		await flushPromises()
		expect(mockGet.mock.calls.length).toBe(before + 1)
		expect(mockGet.mock.calls.at(-1)[0]).toBe('/index.php/apps/x/api/inbox')
		expect(wrapper.emitted('refresh')).toBeTruthy()
	})
})
