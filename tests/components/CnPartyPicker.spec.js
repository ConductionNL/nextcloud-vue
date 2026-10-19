/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnPartyPicker: one search field over people, organisations and contacts
 * (dossiq's InitiatorPicker, board DqNieuweZaak "Aanvrager"; pipelinq and
 * shillinq reuse it for clients).
 *
 * @spec openspec/changes/party-picker/specs/party-picker/spec.md#requirement-one-search-field-over-several-kinds-of-party
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnPartyPicker from '../../src/components/CnPartyPicker/CnPartyPicker.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

const SOURCES = [
	{ id: 'person', register: 'dossiq', schema: 'brpPerson', label: 'Resident', title: '{firstName} {lastName}', secondary: '{residence.street} {residence.houseNumber}' },
	{ id: 'company', register: 'dossiq', schema: 'kvkCompany', label: 'Organisation', title: '{tradeName}', secondary: 'KvK {sourceId}' },
	{ id: 'contact', type: 'contacts', label: 'Contact' },
]

const SearchSelect = {
	name: 'CnSearchSelect',
	props: ['modelValue', 'options', 'inputLabel', 'placeholder', 'loading', 'filterable', 'clearable'],
	emits: ['update:modelValue', 'search'],
	template: '<div class="ss" />',
}

/**
 * Mount the picker.
 *
 * @param {object} props Props.
 * @return {import('@vue/test-utils').VueWrapper} The picker.
 */
function mountPicker(props = {}) {
	return mount(CnPartyPicker, {
		props: { sources: SOURCES, inputLabel: 'Requester', placeholder: 'Name, BSN, trade name or KvK number', ...props },
		global: { stubs: { CnSearchSelect: SearchSelect }, provide: { cnTranslate: (k) => ({ Resident: 'Inwoner', Organisation: 'Organisatie' })[k] ?? k } },
	})
}

beforeEach(() => {
	jest.useFakeTimers()
	axios.get.mockReset()
	axios.post.mockReset()
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/brpPerson')) {
			return Promise.resolve({ data: { results: [{ id: 'p1', firstName: 'Henk', lastName: 'Visser', residence: { street: 'Beukenlaan', houseNumber: '3' } }] } })
		}
		if (url.endsWith('/kvkCompany')) {
			return Promise.resolve({ data: { results: [{ id: 'c1', tradeName: 'Visser Bouw B.V.', sourceId: '24157431' }] } })
		}
		if (url.endsWith('/brpPerson/p9')) {
			return Promise.resolve({ data: { id: 'p9', firstName: 'Sanne', lastName: 'de Vries' } })
		}
		return Promise.reject(new Error('404'))
	})
	axios.post.mockResolvedValue({ data: { contacts: [{ id: 'k1', fullName: 'Anouk Visser', emailAddresses: ['anouk@example.org'] }] } })
})

afterEach(() => {
	jest.useRealTimers()
})

describe('CnPartyPicker', () => {
	it('searches every source at once and lists the rows with a kind and a second line', async () => {
		const w = mountPicker()
		w.findComponent(SearchSelect).vm.$emit('search', 'Visser')
		jest.advanceTimersByTime(300)
		await flushPromises()
		const [personUrl, { params }] = axios.get.mock.calls.find(([url]) => url.endsWith('/brpPerson'))
		expect(personUrl).toBe('/nc/apps/openregister/api/objects/dossiq/brpPerson')
		expect(params).toEqual({ _search: 'Visser', _limit: 8 })
		expect(axios.post).toHaveBeenCalledWith('/nc/contactsmenu/contacts', { filter: 'Visser' })
		const options = w.findComponent(SearchSelect).props('options')
		expect(options.map((o) => [o.id, o.label, o.secondary])).toEqual([
			['p1', 'Henk Visser', 'Inwoner · Beukenlaan 3'],
			['c1', 'Visser Bouw B.V.', 'Organisatie · KvK 24157431'],
			['k1', 'Anouk Visser', 'Contact · anouk@example.org'],
		])
		expect(w.findComponent(SearchSelect).props('placeholder')).toBe('Name, BSN, trade name or KvK number')
	})

	it('does not search below the minimum length', async () => {
		const w = mountPicker()
		w.findComponent(SearchSelect).vm.$emit('search', 'V')
		jest.advanceTimersByTime(300)
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('emits the id and the whole choice', async () => {
		const w = mountPicker()
		w.findComponent(SearchSelect).vm.$emit('search', 'Visser')
		jest.advanceTimersByTime(300)
		await flushPromises()
		w.findComponent(SearchSelect).vm.$emit('update:modelValue', 'c1')
		expect(w.emitted('update:modelValue')[0]).toEqual(['c1'])
		expect(w.emitted('select')[0][0]).toMatchObject({ source: 'company', id: 'c1', label: 'Visser Bouw B.V.' })
		w.findComponent(SearchSelect).vm.$emit('update:modelValue', null)
		expect(w.emitted('select')[1][0]).toBeNull()
	})

	it('names a value it does not list by looking it up in the sources', async () => {
		const w = mountPicker({ modelValue: 'p9' })
		await flushPromises()
		expect(w.findComponent(SearchSelect).props('modelValue')).toMatchObject({ id: 'p9', label: 'Sanne de Vries' })
	})

	it('takes a given name without a lookup', async () => {
		const w = mountPicker({ modelValue: 'p9', selectedLabel: 'S. de Vries' })
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
		expect(w.findComponent(SearchSelect).props('modelValue')).toMatchObject({ label: 'S. de Vries' })
	})
})
