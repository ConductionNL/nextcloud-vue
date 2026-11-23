/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * party-picker-kind-switch (DqNieuweZaak "Soort aanvrager": Persoon /
 * Organisatie / Contact): a switch above the field, only the chosen source
 * searched.
 *
 * @spec openspec/changes/party-picker-kind-switch/specs/party-picker-kind-switch/spec.md#requirement-a-party-picker-can-switch-between-kinds
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnPartyPicker from '../../src/components/CnPartyPicker/CnPartyPicker.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

const SOURCES = [
	{ id: 'person', kind: 'Person', register: 'dossiq', schema: 'brpPerson', label: 'BRP' },
	{ id: 'company', kind: 'Organisation', register: 'dossiq', schema: 'kvkCompany', label: 'CoC', title: '{tradeName}' },
	{ id: 'contact', type: 'contacts', label: 'Contact' },
]
const SearchSelect = { name: 'CnSearchSelect', props: ['options'], emits: ['update:modelValue', 'search'], template: '<div class="ss" />' }

/**
 * @param {object} props Extra props.
 * @return {object} The picker.
 */
function mountPicker(props) {
	return mount(CnPartyPicker, {
		props: { sources: SOURCES, inputLabel: 'Requester', ...props },
		global: { stubs: { CnSearchSelect: SearchSelect }, provide: { cnTranslate: (k) => ({ Person: 'Persoon', Organisation: 'Organisatie', 'Kind of requester': 'Soort aanvrager' })[k] ?? k } },
	})
}

describe('CnPartyPicker kind switch', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: { results: [{ id: 'c1', tradeName: 'Visser Bouw B.V.' }] } })
		axios.post.mockResolvedValue({ data: { contacts: [] } })
	})

	it('draws one segment per source, named by its kind, the first chosen', () => {
		const w = mountPicker({ kindSwitch: { label: 'Kind of requester' } })
		const group = w.find('[data-testid="cn-party-picker-kinds"]')
		expect(group.attributes('aria-label')).toBe('Soort aanvrager')
		expect(group.findAll('button').map((b) => b.text())).toEqual(['Persoon', 'Organisatie', 'Contact'])
		expect(group.find('[aria-pressed="true"]').text()).toBe('Persoon')
		expect(group.classes()).toContain('cn-segmented-control--compact')
	})

	it('hides the switch while a party is chosen and brings it back when the field is cleared', async () => {
		const w = mountPicker({ kindSwitch: { label: 'Kind of requester' }, modelValue: 'p1', selectedLabel: 'Henk Visser' })
		expect(w.find('[data-testid="cn-party-picker-kinds"]').exists()).toBe(false)
		await w.setProps({ modelValue: null })
		expect(w.find('[data-testid="cn-party-picker-kinds"]').exists()).toBe(true)
	})

	it('searches only the chosen source, and a switch searches the new one for the last term', async () => {
		const w = mountPicker({ kindSwitch: { label: 'Kind of requester' } })
		await w.vm.search('Visser')
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toContain('brpPerson')
		axios.get.mockClear()
		await w.findAll('[data-testid="cn-party-picker-kinds"] button')[1].trigger('click')
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toContain('kvkCompany')
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('without kindSwitch searches every source and draws no switch', async () => {
		const w = mountPicker({})
		expect(w.find('[data-testid="cn-party-picker-kinds"]').exists()).toBe(false)
		await w.vm.search('Visser')
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(axios.post).toHaveBeenCalledTimes(1)
	})
})
