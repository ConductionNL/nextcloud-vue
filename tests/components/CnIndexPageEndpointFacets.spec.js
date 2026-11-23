/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An endpoint index offers a facet the endpoint counts in its answer
 * (`sourceConfig.facets`, dossiq's postvak channels: `channels: [{ value,
 * count }]`) as a select after the search; a choice is a page filter the
 * endpoint narrows by, through `searchFields`.
 *
 * @spec openspec/changes/index-endpoint-source-states/specs/index-page/spec.md
 */

var mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}`, generateOcsUrl: (url) => url }))

import { flushPromises, mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { resolveIndexSource } from '../../src/composables/indexSources.js'

const ANSWER = {
	results: [{ id: 'm1', subject: 'Kapvergunning' }],
	channels: [{ value: 'email', count: 11 }, { value: 'portal', count: 6 }],
}

const sourceConfig = {
	url: '/apps/x/api/triage',
	rowsPath: 'results',
	searchFields: { channel: { param: 'channel', single: true } },
	facets: [{ field: 'channel', path: 'channels', label: 'Channel', allLabel: 'all', labels: { email: 'E-mail' } }],
}

/**
 * Mount the page over the endpoint source.
 *
 * @param {object} [query] The route query.
 * @return {object} The wrapper.
 */
function mountPage(query = {}) {
	const $route = { query, params: {}, path: '/postvak' }
	const $router = { replace: jest.fn(() => Promise.resolve()), push: jest.fn() }
	return mount(CnIndexPage, {
		propsData: { title: 'Mailbox', entitySource: 'endpoint', sourceConfig, columns: [{ key: 'subject', label: 'Message' }] },
		global: { mocks: { $route, $router } },
		mocks: { $route, $router },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
	})
}

beforeEach(() => mockGet.mockReset())

describe('endpoint source facets', () => {
	it('reads each declared facet off the answer and never sends the declaration', async () => {
		mockGet.mockResolvedValue({ data: ANSWER })
		const source = resolveIndexSource('endpoint', sourceConfig, {})
		await source.load(sourceConfig)
		expect(source.facets()).toEqual({ channel: ANSWER.channels })
		expect(mockGet.mock.calls[0][1].params).toEqual({})
	})

	it('offers the counted values as a select after the search', async () => {
		mockGet.mockResolvedValue({ data: ANSWER })
		const wrapper = mountPage()
		await flushPromises()
		const select = wrapper.find('[data-testid="cn-source-facet-channel"] select')
		expect(select.exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-source-facet-channel"]').text()).toContain('Channel')
		const options = select.findAll('option').map((o) => [o.attributes('value'), o.text()])
		expect(options).toEqual([['', 'all'], ['email', 'E-mail (11)'], ['portal', 'portal (6)']])
	})

	it('narrows the endpoint by the chosen value, and the empty choice takes it off', async () => {
		mockGet.mockResolvedValue({ data: ANSWER })
		const wrapper = mountPage()
		await flushPromises()
		await wrapper.find('[data-testid="cn-source-facet-channel"] select').setValue('portal')
		await flushPromises()
		expect(mockGet.mock.calls.at(-1)[1].params).toEqual({ channel: 'portal' })
		await wrapper.find('[data-testid="cn-source-facet-channel"] select').setValue('')
		await flushPromises()
		expect(mockGet.mock.calls.at(-1)[1].params).toEqual({})
	})

	it('keeps a chosen value that the narrowed answer no longer counts', async () => {
		mockGet.mockResolvedValue({ data: { results: [], channels: [] } })
		const wrapper = mountPage({ channel: 'webform' })
		await flushPromises()
		const select = wrapper.find('[data-testid="cn-source-facet-channel"] select')
		expect(select.element.value).toBe('webform')
	})

	it('draws no picker for a facet declared picker: false, and still reads its counts', async () => {
		mockGet.mockResolvedValue({ data: ANSWER })
		const $route = { query: {}, params: {}, path: '/postvak' }
		const $router = { replace: jest.fn(() => Promise.resolve()), push: jest.fn() }
		const quiet = { ...sourceConfig, facets: [{ ...sourceConfig.facets[0], picker: false }] }
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Mailbox', entitySource: 'endpoint', sourceConfig: quiet, columns: [{ key: 'subject', label: 'Message' }] },
			global: { mocks: { $route, $router } },
			mocks: { $route, $router },
			stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
		})
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-source-facet-channel"]').exists()).toBe(false)
		expect(wrapper.vm.namedSource.facets()).toEqual({ channel: ANSWER.channels })
	})
})
