/**
 * Tests for the `spend-analytics` dashboard widget renderer (cn-widget-library).
 *
 * Covers the no-source empty state, the financeq-absent empty state, and the
 * self-registering registry entry (with the soft `requires.graphql` hint).
 */

import { mount } from '@vue/test-utils'
import CnSpendAnalyticsWidget from '@/components/CnSpendAnalyticsWidget/CnSpendAnalyticsWidget.vue'

describe('CnSpendAnalyticsWidget renderer', () => {
	it('shows the no-source empty state when no data source is available', () => {
		const wrapper = mount(CnSpendAnalyticsWidget, { propsData: { content: {} } })
		const state = wrapper.find('.cn-spend-analytics-widget__state')
		expect(state.exists()).toBe(true)
		expect(state.text()).toContain('No spend data source available')
	})

	it('shows the "financeq is not installed" empty state when finance is unavailable', async () => {
		const dataSource = {
			fetchSummary: jest.fn().mockResolvedValue({
				available: false,
				empty: false,
				total: 0,
				currency: 'EUR',
				byCategory: [],
				trend: [],
			}),
		}
		const wrapper = mount(CnSpendAnalyticsWidget, { propsData: { content: {}, dataSource } })
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()
		expect(dataSource.fetchSummary).toHaveBeenCalled()
		expect(wrapper.find('.cn-spend-analytics-widget__state').text()).toContain('financeq is not installed')
	})

	it('renders the total when the source provides finance data', async () => {
		const dataSource = {
			fetchSummary: jest.fn().mockResolvedValue({
				available: true,
				empty: false,
				total: 1000,
				currency: 'EUR',
				byCategory: [{ category: 'IT', amount: 1000 }],
				trend: [],
			}),
		}
		const wrapper = mount(CnSpendAnalyticsWidget, { propsData: { content: {}, dataSource } })
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-spend-analytics-widget__card-value').exists()).toBe(true)
	})

	it('renders a top-category row as a real link to its deep link', async () => {
		const dataSource = {
			fetchSummary: jest.fn().mockResolvedValue({
				available: true,
				empty: false,
				total: 1500,
				currency: 'EUR',
				byCategory: [{ category: 'IT', amount: 1000 }, { category: 'HR', amount: 500 }],
				trend: [],
			}),
			resolveDeepLink: jest.fn((app, kind, id) => (id === 'IT' ? `/apps/${app}/${kind}/${id}` : '')),
		}
		const wrapper = mount(CnSpendAnalyticsWidget, { propsData: { content: { viewMode: 'top-categories' }, dataSource } })
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-spend-analytics-widget__row')
		expect(rows.length).toBe(2)
		expect(rows[0].element.tagName).toBe('A')
		expect(rows[0].attributes('href')).toBe('/apps/financeq/category/IT')
		// An unresolved row is plain text, not an inert button.
		expect(rows[1].element.tagName).toBe('DIV')
		expect(rows[1].attributes('role')).toBeUndefined()
	})
})

describe('spend-analytics registry registration', () => {
	it('registers the spend-analytics type with a soft graphql hint', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnSpendAnalyticsWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('spend-analytics')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.requires).toMatchObject({ graphql: ['financeq', 'procest'] })
	})
})
