import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSearchPage `sources`: a manifest `search` page that names the lists to
 * search runs the search itself, one request per list, and offers the lists
 * as a Type filter with their counts (decidiq board DcZoeken: Alles,
 * Vergaderingen, Besluiten, Notulen, Documenten). Without `sources` the page
 * stays the controlled component it was.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnSearchPage from '../../src/components/CnSearchPage/CnSearchPage.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))

const SOURCES = [
	{ id: 'meetings', label: 'Meetings', register: 'decidiq', schema: 'meeting', route: 'MeetingDetail' },
	{ id: 'decisions', label: 'Decisions', register: 'decidiq', schema: 'decision', route: 'DecisionDetail', snippetField: 'text' },
]

/** Let the requests settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

/**
 * @param {object} props Extra props.
 * @return {object} The wrapper and the router double.
 */
function mountPage(props = {}) {
	const router = { push: jest.fn() }
	const wrapper = mount(CnSearchPage, {
		props: { sources: SOURCES, ...props },
		global: { mocks: { $router: router } },
	})
	return { wrapper, router }
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation((url) => Promise.resolve({
		data: url.endsWith('/meeting')
			? { results: [{ id: 'm-1', title: 'Raad 15 oktober' }], total: 1 }
			: { results: [{ id: 'd-1', title: 'Verordening parkeren', text: 'De raad stelt vast' }, { id: 'd-2', title: 'Parkeertarieven' }], total: 9 },
	}))
})

describe('CnSearchPage sources', () => {
	it('searches every list with the query', async () => {
		const { wrapper } = mountPage()
		await wrapper.find('[data-testid="cn-search-page-input"]').setValue('parkeren')
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/decidiq/meeting', { params: { _search: 'parkeren', _limit: 10 } })
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/objects/decidiq/decision', { params: { _search: 'parkeren', _limit: 10 } })
		const titles = wrapper.findAll('.cn-search-page__result-title').map((node) => node.text())
		expect(titles).toEqual(['Raad 15 oktober', 'Verordening parkeren', 'Parkeertarieven'])
		expect(wrapper.text()).toContain('De raad stelt vast')
	})

	it('offers the lists as a Type filter with their totals, and narrows to one', async () => {
		const { wrapper } = mountPage()
		await wrapper.find('[data-testid="cn-search-page-input"]').setValue('parkeren')
		await wrapper.find('form').trigger('submit')
		await flush()
		const options = wrapper.findAll('.cn-search-page__facet-option')
		expect(options.map((node) => node.text())).toEqual(['Meetings1', 'Decisions9'])
		axios.get.mockClear()
		await options[1].find('input').setValue(true)
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toBe('/apps/openregister/api/objects/decidiq/decision')
		expect(wrapper.findAll('.cn-search-page__result-title')).toHaveLength(2)
	})

	it('opens a result on its own page', async () => {
		const { wrapper, router } = mountPage()
		await wrapper.find('[data-testid="cn-search-page-input"]').setValue('raad')
		await wrapper.find('form').trigger('submit')
		await flush()
		await wrapper.find('.cn-search-page__result').trigger('click')
		expect(router.push).toHaveBeenCalledWith({ name: 'MeetingDetail', params: { id: 'm-1' } })
	})

	it('fetches nothing without sources', async () => {
		const wrapper = mount(CnSearchPage)
		await wrapper.find('form').trigger('submit')
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
	})
})
