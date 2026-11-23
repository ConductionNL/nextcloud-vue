/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * address-search-manual-fallback (DqZaakLocatie "Adres zoeken is nu niet
 * beschikbaar"): when the PDOK proxy does not answer, the field becomes a
 * warning and fields to type the address in.
 *
 * @spec openspec/changes/address-search-manual-fallback/specs/address-search/spec.md#requirement-an-unavailable-address-search-falls-back-to-typed-fields
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnAddressSearch from '../../src/components/CnAddressSearch/CnAddressSearch.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const FIELD = { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<label>{{ label }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></label>' }

/**
 * @param {object} props The props.
 * @return {object} The field.
 */
function mountField(props) {
	return mount(CnAddressSearch, {
		props,
		global: { stubs: { CnSearchSelect: { template: '<div class="search" />' }, NcTextField: FIELD, CnIcon: true, NcButton: true } },
	})
}

describe('CnAddressSearch manual fallback', () => {
	beforeEach(() => axios.get.mockReset())

	it('turns an unavailable search into a stacked warning and typed fields', async () => {
		axios.get.mockRejectedValue({ response: { status: 503 } })
		const w = mountField({ manualFallback: true, unavailableTitle: 'Adres zoeken is nu niet beschikbaar' })
		await w.vm.search('Molenweg')
		await flushPromises()
		expect(w.find('.search').exists()).toBe(false)
		const notice = w.find('[data-testid="cn-address-search-unavailable"]')
		expect(notice.attributes('role')).toBe('status')
		expect(notice.classes()).toContain('cn-notice-widget--stacked')
		expect(notice.text()).toContain('Adres zoeken is nu niet beschikbaar')
		expect(w.find('[data-testid="cn-address-search-manual"]').text()).toContain('Street and house number')
	})

	it('emits the typed address as text and as a manual select', async () => {
		const w = mountField({ manual: true, manualCity: true })
		const inputs = w.findAll('input')
		await inputs[0].setValue('Molenweg 4')
		await inputs[1].setValue('1234 AB')
		await inputs[2].setValue('Zuiddrecht')
		expect(w.emitted('update:modelValue').at(-1)).toEqual(['Molenweg 4, 1234 AB Zuiddrecht'])
		expect(w.emitted('select').at(-1)[0]).toEqual({ result: null, coordinates: null, address: 'Molenweg 4, 1234 AB Zuiddrecht', manual: { street: 'Molenweg 4', postcode: '1234 AB', city: 'Zuiddrecht' } })
	})

	it('keeps the old note without the fallback', async () => {
		axios.get.mockRejectedValue({ response: { status: 404 } })
		const w = mountField({})
		await w.vm.search('Molenweg')
		await flushPromises()
		expect(w.find('[data-testid="cn-address-search-unavailable"]').text()).toBe('Address search is not available right now.')
		expect(w.find('[data-testid="cn-address-search-manual"]').exists()).toBe(false)
	})
})
