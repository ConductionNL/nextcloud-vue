import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnKbSearchWidget `suggestFrom`: on load the widget searches the knowledge
 * base for a text read from the page record, or from the first record a
 * query finds, and shows the best matches under the field (PqKlant
 * Kennisbank). Without a text or a match it shows nothing.
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnKbSearchWidget from '../../src/components/CnKbSearchWidget/CnKbSearchWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url, params = {}) => url.replace(/\{(\w+)\}/g, (m, k) => params[k]) }))

const articles = [
	{ id: 'a1', title: 'Evenementenvergunning: wat regel je', url: '/xwiki/a1' },
	{ id: 'a2', title: 'Verhuizen binnen Zuiddrecht', url: '/xwiki/a2' },
	{ id: 'a3', title: 'Parkeren bij evenementen', url: '/xwiki/a3' },
]

/**
 * Mount on a client page in the board look.
 *
 * @param {object} content The widget content.
 * @param {object} search The provider's search mock.
 * @return {object} The wrapper.
 */
function mount(content, search) {
	return shallowMount(CnKbSearchWidget, {
		propsData: { content },
		provide: {
			cnLook: { value: 'board' },
			cnObjectContext: { value: { objectId: 'client-1', object: { id: 'client-1', name: 'Sanne de Vries', topic: 'Straatfeest Parkstraat' } } },
			cnKbSearchProviders: { default: { search } },
		},
	})
}

describe('CnKbSearchWidget suggestFrom', () => {
	beforeEach(() => axios.get.mockReset())

	it('searches for a text on the page record and shows the best two', async () => {
		const search = jest.fn(async () => articles)
		const w = mount({ suggestFrom: '@object.topic' }, search)
		await flushPromises()
		expect(search).toHaveBeenCalledWith('Straatfeest Parkstraat', expect.objectContaining({ limit: 2 }))
		const links = w.findAll('.cn-kb-search-widget__suggestions a')
		expect(links.map((a) => a.text())).toEqual(['Evenementenvergunning: wat regel je', 'Verhuizen binnen Zuiddrecht'])
	})

	it('reads the text from the first record a query finds', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ title: 'Vraag over vergunning straatfeest' }] } })
		const search = jest.fn(async () => articles.slice(0, 1))
		mount({
			suggestFrom: {
				register: 'pipelinq',
				schema: 'ticket',
				filter: { client: '@objectId', status: { in: ['new', 'in_progress'] } },
				sort: { field: 'occurredAt', dir: 'desc' },
				path: 'title',
			},
			suggestLimit: 3,
		}, search)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/pipelinq/ticket', {
			params: { client: 'client-1', 'status[in]': ['new', 'in_progress'], '_order[occurredAt]': 'desc', _limit: 1 },
		})
		expect(search).toHaveBeenCalledWith('Vraag over vergunning straatfeest', expect.objectContaining({ limit: 3 }))
	})

	it('shows nothing when there is no text to suggest from', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const search = jest.fn(async () => articles)
		const w = mount({ suggestFrom: { register: 'pipelinq', schema: 'ticket', filter: { client: '@objectId' }, path: 'title' } }, search)
		await flushPromises()
		expect(search).not.toHaveBeenCalled()
		expect(w.find('.cn-kb-search-widget__suggestions').exists()).toBe(false)
	})

	it('shows nothing when the knowledge base has no match', async () => {
		const w = mount({ suggestFrom: '@object.topic' }, jest.fn(async () => []))
		await flushPromises()
		expect(w.find('.cn-kb-search-widget__suggestions').exists()).toBe(false)
		expect(w.find('.cn-kb-search-widget__empty').exists()).toBe(false)
	})

	it('hides the suggestions while the reader types a search', async () => {
		const w = mount({ suggestFrom: '@object.topic' }, jest.fn(async () => articles))
		await flushPromises()
		w.vm.onTermInput('verhuizen')
		await flushPromises()
		expect(w.find('.cn-kb-search-widget__suggestions').exists()).toBe(false)
	})
})
