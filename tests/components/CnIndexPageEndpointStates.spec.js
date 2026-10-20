/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An endpoint index that guards its rows by a role says so when it refuses,
 * searches on the server by a named parameter, and shows a note it read off
 * the answer (a mail intake log: refused without the intake role, searched by
 * sender, "Filters run in this order: ...").
 *
 * @spec openspec/changes/index-endpoint-source-states/specs/index-page/spec.md
 */

var mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}`, generateOcsUrl: (url) => url }))

import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
const { useNamedSource } = require('../../src/components/CnIndexPage/useNamedSource.js')
import { resolveIndexSource } from '../../src/composables/indexSources.js'

/**
 * A refusal as axios rejects it.
 *
 * @param {object} data The body.
 * @return {Error} The error.
 */
function refused(data) {
	return Object.assign(new Error('Request failed with status code 403'), { response: { status: 403, data } })
}

beforeEach(() => mockGet.mockReset())

describe('endpoint source states', () => {
	it('keeps a refusal apart from an empty list, in the endpoint\'s own sentence', async () => {
		mockGet.mockRejectedValue(refused({ message: 'You do not have the intake role.' }))
		const source = resolveIndexSource('endpoint', {}, {})
		await source.load({ url: '/apps/x/api/log' })
		expect(source.refusal()).toBe('You do not have the intake role.')
		expect(source.failed()).toBe(false)
		expect(source.rows()).toEqual([])
	})

	it('falls back to the page\'s refusedText, through the app\'s translate', async () => {
		mockGet.mockRejectedValue(refused({ message: '' }))
		const source = resolveIndexSource('endpoint', {}, { translate: (text) => `nl:${text}` })
		await source.load({ url: '/apps/x/api/log', refusedText: 'Ask for the role.' })
		expect(source.refusal()).toBe('nl:Ask for the role.')
	})

	it('marks another failure as failed and rethrows it', async () => {
		mockGet.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500 } }))
		const source = resolveIndexSource('endpoint')
		await expect(source.load({ url: '/apps/x/api/log' })).rejects.toThrow('boom')
		expect(source.failed()).toBe(true)
		expect(source.refusal()).toBe('')
	})

	it('reads a note off the answer and never sends its own keys as parameters', async () => {
		mockGet.mockResolvedValue({ data: { results: [], filterOrder: ['blocked-sender', 'auto-reply'] } })
		const source = resolveIndexSource('endpoint')
		await source.load({ url: '/apps/x/api/log', notePath: 'filterOrder', noteText: 'Filters run in this order: {value}', refusedText: 'No', searchParam: 'sender', outcome: 'case' })
		expect(source.note()).toBe('Filters run in this order: blocked-sender, auto-reply')
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/x/api/log', { params: { outcome: 'case' } })
	})

	it('sends the search term as the declared parameter and reloads on a new term', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const searchTerm = ref('')
		mount({
			template: '<div />',
			setup() {
				return { named: useNamedSource({ entitySource: 'endpoint', objects: [], quickFilters: null, sourceConfig: { url: '/apps/x/api/log', searchParam: 'sender' } }, { activeQuickFilterIndex: ref(null), searchTerm }) }
			},
		})
		await flushPromises()
		expect(mockGet.mock.calls[0][1].params).toEqual({})
		searchTerm.value = 'a@b.nl'
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(mockGet.mock.calls[1][1].params).toEqual({ sender: 'a@b.nl' })
	})
})

describe('an endpoint index page', () => {
	/**
	 * Mount the page over the endpoint source.
	 *
	 * @param {object} sourceConfig The source config.
	 * @return {object} The wrapper.
	 */
	function mountPage(sourceConfig) {
		const $route = { query: {}, params: {}, path: '/log' }
		const $router = { replace: jest.fn(() => Promise.resolve()), push: jest.fn() }
		return mount(CnIndexPage, {
			propsData: { title: 'Log', entitySource: 'endpoint', sourceConfig, inlineSearch: true, columns: [{ key: 'sender', label: 'Sender' }] },
			global: { mocks: { $route, $router } },
			mocks: { $route, $router },
			stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
		})
	}

	it('shows the refusal instead of the rows and the search', async () => {
		mockGet.mockRejectedValue(refused({ message: 'You do not have the intake role.' }))
		const wrapper = mountPage({ url: '/apps/x/api/log', searchParam: 'sender' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-index-page-source-refusal"]').text()).toContain('You do not have the intake role.')
		expect(wrapper.vm.tabStripEntries).toEqual([])
		expect(wrapper.findComponent({ name: 'CnDataTable' }).exists()).toBe(false)
		expect(wrapper.findComponent({ name: 'CnActionsBar' }).props('showSearch')).toBe(false)
	})

	it('shows the note above the rows and searches through the endpoint', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', sender: 'a@b.nl' }], filterOrder: ['blocked-sender'] } })
		const wrapper = mountPage({ url: '/apps/x/api/log', searchParam: 'sender', notePath: 'filterOrder', noteText: 'Filters run in this order: {value}' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-index-page-source-note"]').text()).toBe('Filters run in this order: blocked-sender')
		wrapper.vm.onSearchEvent('a@b.nl')
		await flushPromises()
		expect(wrapper.vm.effectiveSearchValue).toBe('a@b.nl')
		expect(mockGet.mock.calls.at(-1)[1].params).toEqual({ sender: 'a@b.nl' })
	})

	it('shows the error state, not an empty list, when a load failed', async () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {})
		mockGet.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500 } }))
		const wrapper = mountPage({ url: '/apps/x/api/log' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-index-page-fetch-error"]').exists()).toBe(true)
		error.mockRestore()
	})
})
