/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `layout="rows"` draws one option per row with the input on the left (the
 * dossiq hand-over, archive, publish and decision dialogs); with `multiple`
 * and one option it is the board's checkbox card.
 */
const { mount } = require('@vue/test-utils')
const CnChoiceCards = require('../../src/components/CnChoiceCards/CnChoiceCards.vue').default

const OPTIONS = [
	{ value: 'team', label: 'To a team', description: 'Everyone in the team sees it.' },
	{ value: 'person', label: 'To a colleague' },
]

const stubs = { CnIcon: true, NcLoadingIcon: true, NcNoteCard: true }

describe('CnChoiceCards rows layout', () => {
	it('draws one row per option with the title over the description, and no cards', () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS, layout: 'rows', modelValue: 'team' }, stubs })
		const rows = wrapper.findAll('.cn-choice-cards__row')
		expect(rows).toHaveLength(2)
		expect(rows[0].find('.cn-choice-cards__row-title').text()).toBe('To a team')
		expect(rows[0].find('.cn-choice-cards__row-description').text()).toBe('Everyone in the team sees it.')
		expect(rows[1].find('.cn-choice-cards__row-description').exists()).toBe(false)
		expect(rows[0].classes()).toContain('cn-choice-cards__row--selected')
		expect(rows[0].find('input').attributes('type')).toBe('radio')
		expect(wrapper.find('.cn-choice-cards__grid').exists()).toBe(false)
	})

	it('emits the picked value', async () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS, layout: 'rows', modelValue: 'team' }, stubs })
		await wrapper.findAll('.cn-choice-cards__row input')[1].trigger('change')
		expect(wrapper.emitted('update:modelValue')).toEqual([['person']])
	})

	it('is a checkbox card with multiple and one option', async () => {
		const wrapper = mount(CnChoiceCards, {
			propsData: { options: [{ value: 'publish', label: 'Also publish the decision' }], layout: 'rows', multiple: true, modelValue: [] },
			stubs,
		})
		const input = wrapper.find('.cn-choice-cards__row input')
		expect(input.attributes('type')).toBe('checkbox')
		await input.trigger('change')
		expect(wrapper.emitted('update:modelValue')).toEqual([[['publish']]])
	})

	it('keeps the card grid by default', () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS }, stubs: { ...stubs, CnCard: true } })
		expect(wrapper.find('.cn-choice-cards__grid').exists()).toBe(true)
		expect(wrapper.find('.cn-choice-cards__row').exists()).toBe(false)
	})
})
