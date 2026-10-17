/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * ordered-list-field: an ordered list a user keeps for themselves (board
 * DqPersoonlijkeInstellingen, "Zaaktypen in mijn menu"): rows with move up,
 * move down and remove buttons, a search-as-you-type picker that adds a row,
 * and every change announced, so it works without dragging.
 *
 * @spec openspec/changes/ordered-list-field/specs/ordered-list-field/spec.md#requirement-a-user-keeps-an-ordered-list-with-the-keyboard
 */
import { mount } from '@vue/test-utils'
import CnOrderedListField from '../../src/components/CnOrderedListField/CnOrderedListField.vue'

const OPTIONS = [
	{ value: 'woo', label: 'Woo request' },
	{ value: 'objection', label: 'Objection' },
	{ value: 'permit', label: 'Environment permit' },
	'subsidy',
]

const NcSelectStub = {
	name: 'NcSelect',
	props: ['options', 'inputLabel', 'filterable', 'modelValue'],
	emits: ['update:modelValue', 'search'],
	template: '<div class="select-stub" />',
}

/**
 * @param {object} props Props.
 * @return {object} Wrapper.
 */
function mountList(props = {}) {
	return mount(CnOrderedListField, {
		props: { modelValue: ['woo', 'objection', 'permit'], options: OPTIONS, label: 'Case types in my menu', addLabel: 'Add case type', ...props },
		global: { stubs: { NcSelect: NcSelectStub } },
		attachTo: document.body,
	})
}

describe('CnOrderedListField', () => {
	it('lists the rows in order with their labels, labelled by the field label', () => {
		const w = mountList()
		const rows = w.findAll('.cn-ordered-list-field__row')
		expect(rows.map((r) => r.find('.cn-ordered-list-field__text').text())).toEqual(['Woo request', 'Objection', 'Environment permit'])
		expect(w.find('ol').attributes('aria-labelledby')).toBe(w.find('.cn-ordered-list-field__label').attributes('id'))
		expect(w.find('[data-testid="cn-ordered-list-up-woo"]').attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-ordered-list-down-permit"]').attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-ordered-list-up-objection"]').attributes('aria-label')).toBe('Move Objection up')
		w.unmount()
	})

	it('moves a row up and down, emits the new order and announces it', async () => {
		const w = mountList()
		await w.find('[data-testid="cn-ordered-list-up-objection"]').trigger('click')
		expect(w.emitted('update:modelValue')[0][0]).toEqual(['objection', 'woo', 'permit'])
		expect(w.find('[data-testid="cn-ordered-list-live"]').text()).toBe('Objection moved to position 1 of 3')
		await w.setProps({ modelValue: ['objection', 'woo', 'permit'] })
		await w.find('[data-testid="cn-ordered-list-down-woo"]').trigger('click')
		expect(w.emitted('update:modelValue')[1][0]).toEqual(['objection', 'permit', 'woo'])
		w.unmount()
	})

	it('removes a row and adds a picked choice at the end, offering only what is not listed', async () => {
		const w = mountList()
		await w.find('[data-testid="cn-ordered-list-remove-objection"]').trigger('click')
		expect(w.emitted('update:modelValue')[0][0]).toEqual(['woo', 'permit'])
		expect(w.find('[data-testid="cn-ordered-list-live"]').text()).toBe('Objection removed')
		const select = w.findComponent({ name: 'NcSelect' })
		expect(select.props('inputLabel')).toBe('Add case type')
		expect(select.props('options').map((o) => o.value)).toEqual(['subsidy'])
		select.vm.$emit('update:modelValue', { value: 'subsidy', label: 'subsidy' })
		expect(w.emitted('update:modelValue')[1][0]).toEqual(['woo', 'objection', 'permit', 'subsidy'])
		w.unmount()
	})

	it('hands the typed text to the app when it searches, and leaves filtering to it', () => {
		const w = mountList({ searchable: true })
		const select = w.findComponent({ name: 'NcSelect' })
		expect(select.props('filterable')).toBe(false)
		select.vm.$emit('search', 'obj')
		expect(w.emitted('search')).toEqual([['obj']])
		w.unmount()
	})

	it('shows the empty text, and no buttons or picker when disabled', () => {
		const empty = mountList({ modelValue: [], emptyText: 'No case types yet.' })
		expect(empty.find('[data-testid="cn-ordered-list-empty"]').text()).toBe('No case types yet.')
		empty.unmount()
		const ro = mountList({ disabled: true })
		expect(ro.find('[data-testid="cn-ordered-list-add"]').exists()).toBe(false)
		expect(ro.find('[data-testid="cn-ordered-list-remove-woo"]').attributes('disabled')).toBeDefined()
		ro.unmount()
	})
})
