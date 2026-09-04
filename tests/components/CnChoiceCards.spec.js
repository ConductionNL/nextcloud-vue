/**
 * Tests for CnChoiceCards — pick one option, or several, from a grid of cards.
 */

const { mount } = require('@vue/test-utils')
const CnChoiceCards = require('../../src/components/CnChoiceCards/CnChoiceCards.vue').default

const options = [
	{ value: 'none', label: 'None, I will set this up myself' },
	{ value: 'municipality', label: 'Municipality', description: 'A council and its committees.', stats: [{ label: 'Objects', value: 170 }] },
	{ value: 'corporate', label: 'Company board' },
]

const mountCards = (propsData) => mount(CnChoiceCards, { propsData: { options, ...propsData } })

describe('CnChoiceCards', () => {
	it('renders one card per option, each wrapping a real input', () => {
		const wrapper = mountCards()
		expect(wrapper.findAll('.cn-choice-cards__option')).toHaveLength(3)
		expect(wrapper.findAll('input')).toHaveLength(3)
		expect(wrapper.text()).toContain('Municipality')
		expect(wrapper.text()).toContain('A council and its committees.')
	})

	it('renders radios for a single choice and checkboxes when multiple', () => {
		expect(mountCards().find('input').attributes('type')).toBe('radio')
		expect(mountCards({ multiple: true }).find('input').attributes('type')).toBe('checkbox')
	})

	it('groups its radios under one name, so a second grid cannot steal the selection', () => {
		const first = mountCards()
		const second = mountCards()
		const nameOf = (w) => w.find('input').attributes('name')
		expect(nameOf(first)).toBeTruthy()
		expect(nameOf(first)).not.toBe(nameOf(second))
	})

	it('emits the plain value when a card is picked', async () => {
		const wrapper = mountCards()
		await wrapper.findAll('input')[1].trigger('change')
		expect(wrapper.emitted('update:modelValue')[0]).toEqual(['municipality'])
	})

	it('adds to the selection, and removes on a second pick, when multiple', async () => {
		const wrapper = mountCards({ multiple: true, modelValue: ['none'] })
		await wrapper.findAll('input')[1].trigger('change')
		expect(wrapper.emitted('update:modelValue')[0]).toEqual([['none', 'municipality']])

		const selected = mountCards({ multiple: true, modelValue: ['none', 'municipality'] })
		await selected.findAll('input')[0].trigger('change')
		expect(selected.emitted('update:modelValue')[0]).toEqual([['municipality']])
	})

	it('marks the selected card checked, comparing values as strings', () => {
		const wrapper = mount(CnChoiceCards, {
			propsData: { options: [{ value: 1, label: 'One' }, { value: 2, label: 'Two' }], modelValue: '1' },
		})
		expect(wrapper.findAll('input')[0].element.checked).toBe(true)
		expect(wrapper.findAll('input')[1].element.checked).toBe(false)
	})

	it('accepts the shapes a server list arrives in (id / name)', () => {
		const wrapper = mount(CnChoiceCards, {
			propsData: { options: [{ id: 'works-council', name: 'Works council' }] },
		})
		expect(wrapper.text()).toContain('Works council')
		expect(wrapper.find('input').attributes('value')).toBe('works-council')
	})

	it('emits nothing while disabled', async () => {
		const wrapper = mountCards({ disabled: true })
		await wrapper.findAll('input')[1].trigger('change')
		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
	})

	it('says so when there is nothing to choose from, and waits while loading', () => {
		const empty = mount(CnChoiceCards, { propsData: { options: [] } })
		expect(empty.find('.cn-choice-cards__grid').exists()).toBe(false)
		expect(empty.text()).toContain('Nothing to choose from')

		const loading = mount(CnChoiceCards, { propsData: { options: [], loading: true } })
		expect(loading.attributes('aria-busy')).toBe('true')
		expect(loading.find('.cn-choice-cards__loading').exists()).toBe(true)
	})

	it('titles the group with a legend, not a bare paragraph', () => {
		const wrapper = mountCards({ label: 'Which kind of organisation is this for?' })
		expect(wrapper.find('legend').text()).toBe('Which kind of organisation is this for?')
	})

	it('renders option titles as spans, so six choices are not six headings', () => {
		const wrapper = mountCards()
		expect(wrapper.findAll('h2')).toHaveLength(0)
		expect(wrapper.find('.cn-card__title').element.tagName).toBe('SPAN')
	})
})
