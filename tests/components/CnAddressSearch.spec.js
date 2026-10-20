/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAddressSearch: an address field over the PDOK Locatieserver through the
 * PDOK proxy app (dossiq's AddressSearch, used by its LocationPicker and
 * CaseLocationDialog).
 *
 * @spec openspec/changes/address-search/specs/address-search/spec.md#requirement-an-address-field-over-the-pdok-locatieserver
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnAddressSearch, { addressCoordinates } from '../../src/components/CnAddressSearch/CnAddressSearch.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

const SearchSelect = {
	name: 'CnSearchSelect',
	props: ['modelValue', 'options', 'inputLabel', 'placeholder', 'loading', 'filterable', 'clearable'],
	emits: ['update:modelValue', 'search'],
	template: '<div class="ss" />',
}

const SUGGEST = [
	{ id: 'adr-1', type: 'adres', weergavenaam: 'Beukenlaan 3, 3311AB Zuiddrecht', gemeentenaam: 'Zuiddrecht' },
	{ id: 'weg-1', type: 'weg', weergavenaam: 'Beukenlaan, Oudewater', gemeentenaam: 'Oudewater' },
]

/**
 * Mount the field.
 *
 * @param {object} props Props.
 * @return {import('@vue/test-utils').VueWrapper} The field.
 */
function mountField(props = {}) {
	return mount(CnAddressSearch, { props, global: { stubs: { CnSearchSelect: SearchSelect } } })
}

/**
 * Type a term and let the search run.
 *
 * @param {import('@vue/test-utils').VueWrapper} w The field.
 * @param {string} term The term.
 * @return {Promise<void>}
 */
async function type(w, term) {
	w.findComponent(SearchSelect).vm.$emit('search', term)
	jest.advanceTimersByTime(300)
	await flushPromises()
}

beforeEach(() => {
	jest.useFakeTimers()
	window.OC = { appswebroots: { openconnector: '/apps/openconnector' } }
	axios.get.mockReset()
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/suggest')) {
			return Promise.resolve({ data: { docs: SUGGEST } })
		}
		if (url.endsWith('/lookup/adr-1')) {
			return Promise.resolve({ data: { docs: [{ id: 'adr-1', weergavenaam: 'Beukenlaan 3, 3311AB Zuiddrecht', centroide_ll: 'POINT(4.81 51.81)' }] } })
		}
		return Promise.reject(new Error('unexpected'))
	})
})

afterEach(() => {
	jest.useRealTimers()
	delete window.OC
})

describe('CnAddressSearch', () => {
	it('suggests addresses through the installed PDOK proxy app', async () => {
		const w = mountField()
		await type(w, 'Beukenlaan')
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openconnector/api/pdok/suggest', { params: { q: 'Beukenlaan' } })
		const options = w.findComponent(SearchSelect).props('options')
		expect(options.map((o) => [o.id, o.label, o.secondary])).toEqual([
			['adr-1', 'Beukenlaan 3, 3311AB Zuiddrecht', 'Address'],
			['weg-1', 'Beukenlaan, Oudewater', 'Street'],
		])
	})

	it('does not search below the minimum length, and uses a given endpoint', async () => {
		const w = mountField({ endpoint: '/custom/pdok/' })
		await type(w, 'Be')
		expect(axios.get).not.toHaveBeenCalled()
		await type(w, 'Beuk')
		expect(axios.get.mock.calls[0][0]).toBe('/nc/custom/pdok/suggest')
	})

	it('falls back to a free-text search when nothing is suggested', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: { docs: url.endsWith('/free') ? [{ id: 'pc', type: 'postcode', weergavenaam: '3311AB' }] : [] } }))
		const w = mountField({ rows: 5 })
		await type(w, '3311AB')
		expect(axios.get).toHaveBeenLastCalledWith('/nc/apps/openconnector/api/pdok/free', { params: { q: '3311AB', rows: 5 } })
		expect(w.findComponent(SearchSelect).props('options').map((o) => o.label)).toEqual(['3311AB'])
	})

	it('looks up the picked address and emits it with coordinates', async () => {
		const w = mountField()
		await type(w, 'Beukenlaan')
		w.findComponent(SearchSelect).vm.$emit('update:modelValue', 'adr-1')
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openconnector/api/pdok/lookup/adr-1', { params: {} })
		expect(w.emitted('update:modelValue')).toEqual([['Beukenlaan 3, 3311AB Zuiddrecht']])
		const [[chosen]] = w.emitted('select')
		expect(chosen.address).toBe('Beukenlaan 3, 3311AB Zuiddrecht')
		expect(chosen.coordinates).toEqual({ lat: 51.81, lng: 4.81 })
		expect(chosen.result.id).toBe('adr-1')
	})

	it('says search is unavailable when the proxy is missing, and clears to null', async () => {
		axios.get.mockRejectedValue({ response: { status: 404 } })
		const w = mountField({ modelValue: 'Beukenlaan 3' })
		await type(w, 'Beukenlaan')
		expect(w.find('[data-testid="cn-address-search-unavailable"]').exists()).toBe(true)
		expect(w.findComponent(SearchSelect).props('modelValue')).not.toBeNull()
		w.findComponent(SearchSelect).vm.$emit('update:modelValue', null)
		await flushPromises()
		expect(w.emitted('update:modelValue')).toEqual([[null]])
		expect(w.emitted('select')).toEqual([[null]])
	})

	it('reads coordinates from a normalised location as well', () => {
		expect(addressCoordinates({ location: { coordinates: [5.1, 52.1] } })).toEqual({ lat: 52.1, lng: 5.1 })
		expect(addressCoordinates({})).toBeNull()
	})
})
