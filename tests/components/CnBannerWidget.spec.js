/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnBannerWidget (Wave 1, nextcloud-vue#91):
 * - variant / text via flat props AND via the stored content blob
 * - registered in dashboardWidgetRegistry (`banner`) + BUILT_IN_WIDGETS
 * - visibleWhen predicate against an endpoint response (the doriath
 *   migration-banner acceptance case: pending > 0) and an OR source total
 * - fail-safe: fetch failure keeps the banner hidden
 * - click-through route navigation
 */

import { mount } from '@vue/test-utils'

const CnBannerWidget = require('../../src/components/CnBannerWidget/CnBannerWidget.vue').default

/**
 * Install a global fetch mock resolving the given JSON payload.
 *
 * @param {object} payload The JSON body.
 * @param {boolean} [ok] Response ok flag.
 * @return {jest.Mock} The mock.
 */
function mockFetch(payload, ok = true) {
	const mock = jest.fn().mockResolvedValue({ ok, json: async () => payload })
	global.fetch = mock
	return mock
}

/**
 * Wait until pending promise chains settle.
 *
 * @return {Promise<void>}
 */
const flush = () => new Promise((resolve) => setTimeout(resolve))

describe('CnBannerWidget', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('renders text + variant from flat props (v2 grid path)', () => {
		const wrapper = mount(CnBannerWidget, {
			propsData: { text: 'Heads up', variant: 'warning' },
		})
		expect(wrapper.find('[data-testid="cn-banner-widget-text"]').text()).toBe('Heads up')
		expect(wrapper.find('.stub.NcNoteCard').attributes('type')).toBe('warning')
	})

	it('renders from the stored content blob (dashboard registry path); flat props win', () => {
		const wrapper = mount(CnBannerWidget, {
			propsData: { content: { text: 'From content', variant: 'error' } },
		})
		expect(wrapper.find('[data-testid="cn-banner-widget-text"]').text()).toBe('From content')
		expect(wrapper.find('.stub.NcNoteCard').attributes('type')).toBe('error')

		const winning = mount(CnBannerWidget, {
			propsData: { text: 'Flat wins', content: { text: 'From content' } },
		})
		expect(winning.find('[data-testid="cn-banner-widget-text"]').text()).toBe('Flat wins')
	})

	it('defaults to the info variant and hides without a text', () => {
		expect(mount(CnBannerWidget, { propsData: { text: 'x' } })
			.find('.stub.NcNoteCard').attributes('type')).toBe('info')
		expect(mount(CnBannerWidget).find('.cn-banner-widget').exists()).toBe(false)
	})

	it('is registered in dashboardWidgetRegistry and BUILT_IN_WIDGETS', () => {
		require('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
		const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		const { BUILT_IN_WIDGETS } = require('../../src/components/CnWidgetGrid/builtInWidgets.js')
		const entry = getWidgetTypeEntry('banner')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBe(CnBannerWidget)
		expect(entry.form).toBeDefined()
		expect(BUILT_IN_WIDGETS.banner).toBe(CnBannerWidget)
	})

	describe('visibleWhen', () => {
		it('stays hidden until the endpoint condition evaluates true (migration-banner case)', async () => {
			mockFetch({ pending: 3 })
			const wrapper = mount(CnBannerWidget, {
				propsData: {
					text: 'Migrations pending',
					variant: 'warning',
					visibleWhen: { endpoint: '/apps/doriath/api/migrations/status', field: 'pending', op: 'gt', value: 0 },
				},
			})
			// Hidden before the fetch resolves.
			expect(wrapper.find('.cn-banner-widget').exists()).toBe(false)
			await flush()
			expect(wrapper.find('.cn-banner-widget').exists()).toBe(true)
		})

		it('hides when the endpoint condition evaluates false', async () => {
			mockFetch({ pending: 0 })
			const wrapper = mount(CnBannerWidget, {
				propsData: {
					text: 'Migrations pending',
					visibleWhen: { endpoint: '/x', field: 'pending', op: 'gt', value: 0 },
				},
			})
			await flush()
			expect(wrapper.find('.cn-banner-widget').exists()).toBe(false)
		})

		it('supports dot-path fields and eq default operator', async () => {
			mockFetch({ status: { phase: 'degraded' } })
			const wrapper = mount(CnBannerWidget, {
				propsData: {
					text: 'Degraded',
					visibleWhen: { endpoint: '/health', field: 'status.phase', value: 'degraded' },
				},
			})
			await flush()
			expect(wrapper.find('.cn-banner-widget').exists()).toBe(true)
		})

		it('evaluates an OR source against the collection total with token-resolved filters', async () => {
			const fetchMock = mockFetch({ total: 2, results: [{}, {}] })
			window.OC = { currentUser: 'alice' }
			const wrapper = mount(CnBannerWidget, {
				propsData: {
					text: 'Open tasks',
					visibleWhen: {
						source: { register: 'pipelinq', schema: 'task', filter: { assignee: '@me' } },
						op: 'gt',
						value: 0,
					},
				},
			})
			await flush()
			expect(wrapper.find('.cn-banner-widget').exists()).toBe(true)
			const url = fetchMock.mock.calls[0][0]
			expect(url).toContain('/apps/openregister/api/objects/pipelinq/task')
			expect(url).toContain('assignee=alice')
			expect(url).toContain('_limit=1')
		})

		it('fail-safe: a failing fetch keeps the banner hidden', async () => {
			mockFetch({}, false)
			const wrapper = mount(CnBannerWidget, {
				propsData: { text: 'x', visibleWhen: { endpoint: '/broken', field: 'a', value: 1 } },
			})
			await flush()
			expect(wrapper.find('.cn-banner-widget').exists()).toBe(false)
		})
	})

	describe('click route', () => {
		it('pushes the named route on click', async () => {
			const push = jest.fn().mockResolvedValue()
			const wrapper = mount(CnBannerWidget, {
				propsData: { text: 'Go', route: 'migrations' },
				mocks: { $router: { push } },
			})
			await wrapper.find('[data-testid="cn-banner-widget-text"]').trigger('click')
			expect(push).toHaveBeenCalledWith({ name: 'migrations' })
		})

		it('renders an accessible button and supports a location object', async () => {
			const push = jest.fn().mockResolvedValue()
			const route = { name: 'detail', params: { id: '1' } }
			const wrapper = mount(CnBannerWidget, {
				propsData: { text: 'Go', route },
				mocks: { $router: { push } },
			})
			const el = wrapper.find('[data-testid="cn-banner-widget-text"]')
			expect(el.attributes('role')).toBe('button')
			expect(el.attributes('tabindex')).toBe('0')
			await el.trigger('keydown.enter')
			expect(push).toHaveBeenCalledWith(route)
		})

		it('renders static text (no button semantics) without a route', () => {
			const wrapper = mount(CnBannerWidget, { propsData: { text: 'Static' } })
			const el = wrapper.find('[data-testid="cn-banner-widget-text"]')
			expect(el.attributes('role')).toBeUndefined()
			expect(el.element.tagName).toBe('SPAN')
		})
	})
})
