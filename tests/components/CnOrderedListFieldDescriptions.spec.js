/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * ordered-list-descriptions: a choice of CnOrderedListField can carry a muted
 * second line (`description`, "19 open cases") and an `icon` in a small tile,
 * in the row and in the picker (board DqPersoonlijkeInstellingen, "Woo-verzoek
 * · 19 open zaken"). The row's buttons name the description as theirs. A
 * choice without them renders as before.
 *
 * @spec openspec/changes/ordered-list-descriptions/specs/ordered-list-field/spec.md#requirement-a-choice-can-carry-a-description-and-an-icon
 */
import { mount } from '@vue/test-utils'
import CnOrderedListField from '../../src/components/CnOrderedListField/CnOrderedListField.vue'

const OPTIONS = [
	{ value: 'woo', label: 'Woo request', description: '19 open cases', icon: 'FileDocumentOutline' },
	{ value: 'objection', label: 'Objection' },
	{ value: 'permit', label: 'Environment permit', description: '4 open cases' },
]

const NcSelectStub = {
	name: 'NcSelect',
	props: ['options'],
	template: '<ul class="select-stub"><li v-for="o in options" :key="o.value" class="opt"><slot name="option" v-bind="o" /></li></ul>',
}

/**
 * @return {object} Wrapper.
 */
function mountList() {
	return mount(CnOrderedListField, {
		props: { modelValue: ['woo', 'objection'], options: OPTIONS, label: 'Case types in my menu' },
		global: { stubs: { NcSelect: NcSelectStub, CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' } } },
	})
}

describe('CnOrderedListField: descriptions and icons', () => {
	it('draws a row\'s description and icon, and the row without them as before', () => {
		const w = mountList()
		const woo = w.find('[data-testid="cn-ordered-list-row-woo"]')
		expect(woo.find('.cn-ordered-list-field__name').text()).toBe('Woo request')
		expect(woo.find('[data-testid="cn-ordered-list-description-woo"]').text()).toBe('19 open cases')
		expect(woo.find('.cn-ordered-list-field__tile .icon-stub').attributes('data-name')).toBe('FileDocumentOutline')
		const objection = w.find('[data-testid="cn-ordered-list-row-objection"]')
		expect(objection.find('.cn-ordered-list-field__description').exists()).toBe(false)
		expect(objection.find('.cn-ordered-list-field__tile').exists()).toBe(false)
	})

	it('names the description as the description of the row\'s buttons', () => {
		const w = mountList()
		const id = w.find('[data-testid="cn-ordered-list-description-woo"]').attributes('id')
		expect(id).toBeTruthy()
		for (const kind of ['up', 'down', 'remove']) {
			expect(w.find(`[data-testid="cn-ordered-list-${kind}-woo"]`).attributes('aria-describedby')).toBe(id)
			expect(w.find(`[data-testid="cn-ordered-list-${kind}-objection"]`).attributes('aria-describedby')).toBeUndefined()
		}
	})

	it('shows the description in the picker\'s options', () => {
		const w = mountList()
		const options = w.findAll('.select-stub .opt')
		expect(options).toHaveLength(1)
		expect(options[0].find('.cn-ordered-list-field__name').text()).toBe('Environment permit')
		expect(options[0].find('.cn-ordered-list-field__description').text()).toBe('4 open cases')
	})
})
