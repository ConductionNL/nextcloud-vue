/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnBannerWidget, `layout: "attention"`: the attention card. The plain
 * banner's own behaviour is covered by CnBannerWidget.spec.js and must not
 * change, which the first test here pins from this side.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-attention-card
 */

import { mount } from '@vue/test-utils'

const CnBannerWidget = require('../../src/components/CnBannerWidget/CnBannerWidget.vue').default
const CnBannerWidgetForm = require('../../src/components/CnBannerWidgetForm/CnBannerWidgetForm.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve))

const CARD = {
	layout: 'attention',
	variant: 'error',
	kicker: 'First today',
	title: 'Parking permits city centre',
	reason: 'The deadline ends today.',
	actions: [
		{ label: 'Open case', route: { name: 'CaseDetail', params: { id: '61' } } },
		{ label: 'Suspend deadline', id: 'suspend' },
		{ label: 'A third action' },
	],
}

const router = () => ({
	push: jest.fn().mockResolvedValue(),
	resolve: (location) => ({ href: `/app/${location.name}` }),
})

describe('CnBannerWidget attention card', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('leaves the plain banner as it was when no layout is given', () => {
		const wrapper = mount(CnBannerWidget, { propsData: { text: 'Heads up', variant: 'warning' } })
		expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-banner-widget-text"]').text()).toBe('Heads up')
		expect(wrapper.classes()).toEqual(['cn-banner-widget'])
	})

	it('renders the kicker, the title and the reason in a region named by the title', () => {
		const wrapper = mount(CnBannerWidget, { propsData: CARD })
		const card = wrapper.find('[data-testid="cn-banner-widget-attention"]')
		expect(card.element.tagName).toBe('SECTION')
		expect(card.find('.cn-banner-widget__kicker').text()).toBe('First today')
		const title = card.find('.cn-banner-widget__title')
		expect(title.element.tagName).toBe('H3')
		expect(title.text()).toBe('Parking permits city centre')
		expect(card.attributes('aria-labelledby')).toBe(title.attributes('id'))
		expect(card.find('.cn-banner-widget__reason').text()).toBe('The deadline ends today.')
	})

	it.each(['info', 'warning', 'error', 'success'])('carries the %s severity as a class', (variant) => {
		const wrapper = mount(CnBannerWidget, { propsData: { ...CARD, variant } })
		expect(wrapper.classes()).toContain(`cn-banner-widget--${variant}`)
	})

	it('renders two actions at most, the first as primary', () => {
		const wrapper = mount(CnBannerWidget, { propsData: CARD, global: { mocks: { $router: router() } } })
		const actions = wrapper.findAll('[data-testid="cn-banner-widget-action"]')
		expect(actions).toHaveLength(2)
		expect(actions[0].text()).toBe('Open case')
		expect(actions[0].classes()).toContain('cn-banner-widget__action--primary')
		expect(actions[1].classes()).toContain('cn-banner-widget__action--secondary')
		expect(wrapper.text()).not.toContain('A third action')
	})

	it('lets an action claim the primary place', () => {
		const wrapper = mount(CnBannerWidget, {
			propsData: { ...CARD, actions: [{ label: 'Later' }, { label: 'Now', primary: true }] },
		})
		const actions = wrapper.findAll('[data-testid="cn-banner-widget-action"]')
		expect(actions[0].classes()).toContain('cn-banner-widget__action--secondary')
		expect(actions[1].classes()).toContain('cn-banner-widget__action--primary')
	})

	it('renders a routed action as a link and routes a plain click', async () => {
		const $router = router()
		const wrapper = mount(CnBannerWidget, { propsData: CARD, global: { mocks: { $router } } })
		const link = wrapper.findAll('[data-testid="cn-banner-widget-action"]')[0]
		expect(link.element.tagName).toBe('A')
		expect(link.attributes('href')).toBe('/app/CaseDetail')
		await link.trigger('click')
		expect($router.push).toHaveBeenCalledWith({ name: 'CaseDetail', params: { id: '61' } })
		expect(wrapper.emitted('action')).toBeUndefined()
	})

	it('renders an action without a target as a button that emits action', async () => {
		const wrapper = mount(CnBannerWidget, { propsData: CARD, global: { mocks: { $router: router() } } })
		const button = wrapper.findAll('[data-testid="cn-banner-widget-action"]')[1]
		expect(button.element.tagName).toBe('BUTTON')
		expect(button.attributes('type')).toBe('button')
		await button.trigger('click')
		expect(wrapper.emitted('action')).toEqual([[{ id: 'suspend', label: 'Suspend deadline', index: 1 }]])
	})

	it('renders an external action as a plain link and drops an unsafe one', () => {
		const wrapper = mount(CnBannerWidget, {
			propsData: {
				...CARD,
				// eslint-disable-next-line no-script-url
				actions: [{ label: 'Docs', href: 'https://example.org/docs' }, { label: 'Bad', href: 'javascript:alert(1)' }],
			},
		})
		const actions = wrapper.findAll('[data-testid="cn-banner-widget-action"]')
		expect(actions[0].attributes('href')).toBe('https://example.org/docs')
		expect(actions[1].element.tagName).toBe('BUTTON')
	})

	it('renders no action row without actions', () => {
		const wrapper = mount(CnBannerWidget, { propsData: { ...CARD, actions: null } })
		expect(wrapper.find('.cn-banner-widget__actions').exists()).toBe(false)
	})

	it('falls back to text for the title, without repeating it as the reason', () => {
		const wrapper = mount(CnBannerWidget, { propsData: { layout: 'attention', text: 'Only a text' } })
		expect(wrapper.find('.cn-banner-widget__title').text()).toBe('Only a text')
		expect(wrapper.find('.cn-banner-widget__reason').exists()).toBe(false)
	})

	it('uses text as the reason when there is a title and no reason', () => {
		const wrapper = mount(CnBannerWidget, { propsData: { layout: 'attention', title: 'Title', text: 'Because' } })
		expect(wrapper.find('.cn-banner-widget__reason').text()).toBe('Because')
	})

	it('renders nothing without a title or a text', () => {
		const wrapper = mount(CnBannerWidget, { propsData: { layout: 'attention', kicker: 'Only a kicker' } })
		expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(false)
	})

	it('reads the card from the stored content blob', () => {
		const wrapper = mount(CnBannerWidget, { propsData: { content: CARD } })
		expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(true)
		expect(wrapper.find('.cn-banner-widget__kicker').text()).toBe('First today')
		expect(wrapper.findAll('[data-testid="cn-banner-widget-action"]')).toHaveLength(2)
	})

	describe('visibleWhen', () => {
		const visibleWhen = { endpoint: '/apps/x/api/status', field: 'late', op: 'gt', value: 0 }

		it('stays hidden until the condition holds, then fills {value} into the reason', async () => {
			global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ late: 3 }) })
			const wrapper = mount(CnBannerWidget, {
				propsData: { ...CARD, reason: '{value} cases are late.', visibleWhen },
			})
			expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(false)
			await flush()
			expect(wrapper.find('.cn-banner-widget__reason').text()).toBe('3 cases are late.')
		})

		it('stays hidden when the condition does not hold', async () => {
			global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ late: 0 }) })
			const wrapper = mount(CnBannerWidget, { propsData: { ...CARD, visibleWhen } })
			await flush()
			expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(false)
		})
	})
})

describe('CnBannerWidgetForm attention fields', () => {
	it('keeps a plain banner content blob free of attention keys', async () => {
		const wrapper = mount(CnBannerWidgetForm, { propsData: { value: { text: 'Hello', variant: 'info' } } })
		wrapper.vm.update('text', 'Hello again')
		expect(wrapper.emitted('update:content')[0][0]).toEqual({ text: 'Hello again', variant: 'info', route: null, visibleWhen: null })
	})

	it('writes the attention keys and round-trips the manifest actions', () => {
		const wrapper = mount(CnBannerWidgetForm, { propsData: { editingWidget: { content: { ...CARD, text: '' } } } })
		wrapper.vm.update('kicker', 'Now')
		const content = wrapper.emitted('update:content')[0][0]
		expect(content.layout).toBe('attention')
		expect(content.kicker).toBe('Now')
		expect(content.title).toBe(CARD.title)
		expect(content.actions).toEqual(CARD.actions)
	})

	it('asks an attention card for a title or a text, and a banner for a text', () => {
		const attention = mount(CnBannerWidgetForm, { propsData: { value: { layout: 'attention' } } })
		expect(attention.vm.validate()).toHaveLength(1)
		attention.vm.update('title', 'A title')
		expect(attention.vm.validate()).toEqual([])

		const banner = mount(CnBannerWidgetForm, { propsData: { value: {} } })
		expect(banner.vm.validate()).toHaveLength(1)
	})
})
