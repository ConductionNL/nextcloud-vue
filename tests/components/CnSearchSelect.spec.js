/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSearchSelect, the search look of a single picker (DqOverdragen "Nieuw
 * team", DqNieuweZaak "Aanvrager"): rows with an icon or initials, a name, a
 * secondary line and a check on the chosen one.
 *
 * @spec openspec/changes/search-select-look/specs/search-select/spec.md#requirement-a-single-picker-can-take-the-search-look
 */
import { mount } from '@vue/test-utils'
import CnSearchSelect from '../../src/components/CnSearchSelect/CnSearchSelect.vue'

const TEAMS = [
	{ id: 'legal', label: 'Juridische zaken', secondary: '6 leden · bezwaar, beroep en Woo-advies', avatar: true },
	{ id: 'vth', label: 'Vergunningen', secondary: '9 leden', icon: 'AccountGroup' },
]

const NcSelect = {
	name: 'NcSelect',
	props: ['modelValue', 'options', 'inputLabel', 'placeholder', 'filterable', 'clearable'],
	emits: ['update:modelValue', 'search'],
	template: '<div class="nc-select-stub"><div v-for="o in options" :key="o.id" class="opt" @click="$emit(\'update:modelValue\', o)"><slot name="option" v-bind="o" /></div></div>',
}

/**
 * Mount the picker.
 *
 * @param {object} props The props.
 * @return {import('@vue/test-utils').VueWrapper} The picker.
 */
function mountSelect(props) {
	return mount(CnSearchSelect, {
		props: { inputLabel: 'Nieuw team', options: TEAMS, ...props },
		global: { stubs: { NcSelect, CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' } } },
	})
}

describe('CnSearchSelect', () => {
	it('draws each option as a row with initials or an icon, a name and a secondary line', () => {
		const rows = mountSelect({}).findAll('[data-testid="cn-search-select-row"]')
		expect(rows).toHaveLength(2)
		expect(rows[0].find('.cn-search-select__lead').text()).toBe('JZ')
		expect(rows[0].find('.cn-search-select__name').text()).toBe('Juridische zaken')
		expect(rows[0].find('.cn-search-select__secondary').text()).toBe('6 leden · bezwaar, beroep en Woo-advies')
		expect(rows[1].find('.icon').attributes('data-name')).toBe('AccountGroup')
	})

	it('checks the chosen option only', () => {
		const rows = mountSelect({ modelValue: 'vth' }).findAll('[data-testid="cn-search-select-row"]')
		expect(rows[0].find('[data-testid="cn-search-select-check"]').exists()).toBe(false)
		expect(rows[1].find('[data-testid="cn-search-select-check"]').exists()).toBe(true)
	})

	it('emits the picked id, and null when cleared', async () => {
		const w = mountSelect({})
		await w.findAll('.opt')[0].trigger('click')
		expect(w.emitted('update:modelValue')[0]).toEqual(['legal'])
		w.findComponent(NcSelect).vm.$emit('update:modelValue', null)
		expect(w.emitted('update:modelValue')[1]).toEqual([null])
	})

	it('shows a magnifier, a search placeholder and passes the search on', () => {
		const w = mountSelect({})
		expect(w.find('.cn-search-select__magnifier').exists()).toBe(true)
		const select = w.findComponent(NcSelect)
		expect(select.props('placeholder')).toBe('Search…')
		select.vm.$emit('search', 'jur')
		expect(w.emitted('search')[0]).toEqual(['jur'])
	})

	it('resolves an id to its option, and keeps an unknown id as a bare option', () => {
		expect(mountSelect({ modelValue: 'legal' }).vm.selectedOption.label).toBe('Juridische zaken')
		expect(mountSelect({ modelValue: 'gone' }).vm.selectedOption).toEqual({ id: 'gone', label: 'gone' })
		expect(mountSelect({ modelValue: null }).vm.selectedOption).toBeNull()
	})
})
