/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `layout="rows"` draws one option per row with the input on the left (the
 * dossiq hand-over, archive, publish and decision dialogs); with `multiple`
 * and one option it is the board's checkbox card.
 */
const { mount } = require('@vue/test-utils')
const { h } = require('vue')
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

describe('CnChoiceCards disabled options and columns (board DqVolgendeStap)', () => {
	const options = [
		{ value: 'decide', label: 'Take a decision' },
		{ value: 'close', label: 'Close the case', disabled: true, disabledReason: 'A decision has to be taken first.' },
	]

	it('greys out a disabled option in rows, shows its reason and ignores a change', async () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options, layout: 'rows', modelValue: 'decide' }, stubs })
		const row = wrapper.findAll('.cn-choice-cards__row')[1]
		expect(row.classes()).toContain('cn-choice-cards__row--disabled')
		const input = row.find('input')
		expect(input.attributes('disabled')).toBeDefined()
		const reason = row.find('[data-testid="cn-choice-cards-reason"]')
		expect(reason.text()).toBe('A decision has to be taken first.')
		expect(input.attributes('aria-describedby')).toBe(reason.attributes('id'))
		await input.trigger('change')
		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
	})

	it('shows the reason under a disabled card too', () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options }, stubs: { ...stubs, CnCard: true } })
		expect(wrapper.findAll('[data-testid="cn-choice-cards-reason"]')).toHaveLength(1)
		expect(wrapper.findAll('.cn-choice-cards__input')[1].attributes('disabled')).toBeDefined()
	})

	it('stacks the cards in one column with columns 1', () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options, columns: 1 }, stubs: { ...stubs, CnCard: true } })
		expect(wrapper.find('.cn-choice-cards__grid').attributes('style')).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))')
	})

	it('renders fields for the chosen option right after it through option-actions', () => {
		const wrapper = mount(CnChoiceCards, {
			propsData: { options, layout: 'rows', modelValue: 'decide' },
			stubs,
			slots: { 'option-actions': ({ option, selected }) => (selected ? h('p', { class: 'fields' }, option.value) : null) },
		})
		const cells = wrapper.findAll('.cn-choice-cards__cell')
		expect(cells[0].find('.fields').text()).toBe('decide')
		expect(cells[1].find('.fields').exists()).toBe(false)
	})
})

describe('CnChoiceCards rows side by side (board DqZaakSamenwerken)', () => {
	it('sets the rows in a grid of `columns` equal columns', () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS, layout: 'rows', columns: 2 }, stubs })
		const style = wrapper.find('.cn-choice-cards__rows').attributes('style')
		expect(style).toContain('display: grid')
		expect(style).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
	})

	it('keeps one column without columns, or with 1', () => {
		for (const columns of [0, 1]) {
			const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS, layout: 'rows', columns }, stubs })
			expect(wrapper.find('.cn-choice-cards__rows').attributes('style')).toBeUndefined()
		}
	})

	it('keeps a hidden legend for assistive tech with hideLabel', () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS, layout: 'rows', label: 'What you do', hideLabel: true }, stubs })
		const legend = wrapper.find('legend')
		expect(legend.text()).toBe('What you do')
		expect(legend.classes()).toContain('hidden-visually')
	})

	it('shows the legend by default', () => {
		const wrapper = mount(CnChoiceCards, { propsData: { options: OPTIONS, layout: 'rows', label: 'What you do' }, stubs })
		expect(wrapper.find('legend').classes()).not.toContain('hidden-visually')
	})
})
