/**
 * Tests for CnNextStepCard: what this record needs now, next to the button
 * that does it. Also covers the `next-step` detail widget.
 */

const { mount } = require('@vue/test-utils')
const CnNextStepCard = require('../../src/components/CnNextStepCard/CnNextStepCard.vue').default
const CnNextStepWidget = require('../../src/components/CnNextStepCard/CnNextStepWidget.vue').default

const items = [
	{ label: 'Receipt confirmed', done: true },
	{ label: 'Review the open documents', hint: '2 of 5 done' },
	{ label: 'Draft the decision' },
]

const mountCard = (propsData, options = {}) => mount(CnNextStepCard, { propsData: { items, ...propsData }, ...options })

describe('CnNextStepCard', () => {
	it('renders one list item per checklist entry, with its hint', () => {
		const wrapper = mountCard({ title: 'What now?' })
		expect(wrapper.findAll('[data-testid="cn-next-step-item"]')).toHaveLength(3)
		expect(wrapper.text()).toContain('Review the open documents')
		expect(wrapper.text()).toContain('2 of 5 done')
	})

	it('renders nothing at all without a checklist', () => {
		expect(mountCard({ items: [] }).find('[data-testid="cn-next-step-card"]').exists()).toBe(false)
		expect(mountCard({ items: [{ done: true }, null] }).find('[data-testid="cn-next-step-card"]').exists()).toBe(false)
	})

	it('says each item\'s state in words, not only with a marker', () => {
		const states = mountCard().findAll('.cn-next-step-card__state').map((node) => node.text())
		expect(states).toEqual(['Done', 'To do', 'To do'])
	})

	it('emphasises the first open item as the one to pick up', () => {
		const rows = mountCard().findAll('[data-testid="cn-next-step-item"]')
		expect(rows[0].classes()).toContain('cn-next-step-card__item--done')
		expect(rows[0].classes()).not.toContain('cn-next-step-card__item--current')
		expect(rows[1].classes()).toContain('cn-next-step-card__item--current')
		expect(rows[2].classes()).not.toContain('cn-next-step-card__item--current')
	})

	it('labels the region with its heading', () => {
		const wrapper = mountCard({ title: 'What now? Step 2', titleTag: 'h2' })
		const heading = wrapper.find('h2')
		expect(heading.text()).toBe('What now? Step 2')
		expect(wrapper.find('section').attributes('aria-labelledby')).toBe(heading.attributes('id'))
	})

	it('still has an accessible name without a title', () => {
		expect(mountCard().find('section').attributes('aria-label')).toBe('Next step')
	})

	it('renders the primary button with its id and emits action on click', async () => {
		const wrapper = mountCard({ actionLabel: 'Continue reviewing', actionId: 'cn-primary-x' })
		const button = wrapper.find('[data-testid="cn-next-step-action"]')
		expect(button.text()).toContain('Continue reviewing')
		expect(button.attributes('id')).toBe('cn-primary-x')
		await button.trigger('click')
		expect(wrapper.emitted('action')).toHaveLength(1)
	})

	it('renders no button without a label, and shows the after line', () => {
		const wrapper = mountCard({ after: 'Then: step 3, decision' })
		expect(wrapper.find('[data-testid="cn-next-step-action"]').exists()).toBe(false)
		expect(wrapper.find('.cn-next-step-card__after').text()).toBe('Then: step 3, decision')
	})

	it('lets a host replace the button through the action slot', () => {
		const wrapper = mountCard({ actionLabel: 'Ignored' }, { slots: { action: '<button class="own">Own</button>' } })
		expect(wrapper.find('.own').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-next-step-action"]').exists()).toBe(false)
	})
})

describe('CnNextStepWidget (next-step widget type)', () => {
	const content = {
		stages: {
			handling: {
				title: 'Step 2: handling',
				checklist: [{ label: 'Confirm receipt', doneField: 'receiptConfirmed' }],
			},
		},
	}

	it('renders the card for the record\'s stage', () => {
		const wrapper = mount(CnNextStepWidget, {
			propsData: { content, objectData: { status: 'handling', receiptConfirmed: true } },
		})
		expect(wrapper.text()).toContain('Step 2: handling')
		expect(wrapper.find('.cn-next-step-card__item--done').exists()).toBe(true)
	})

	it('renders nothing for a stage that declares no checklist', () => {
		const wrapper = mount(CnNextStepWidget, { propsData: { content, objectData: { status: 'closed' } } })
		expect(wrapper.find('[data-testid="cn-next-step-card"]').exists()).toBe(false)
	})

	it('is registered as a detail-only widget type', () => {
		require('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
		const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		for (const type of ['next-step', 'document-review', 'conversation']) {
			expect(getWidgetTypeEntry(type).surfaces).toEqual(['detail-page'])
			expect(getWidgetTypeEntry(type).renderer).toBeTruthy()
		}
	})
})
