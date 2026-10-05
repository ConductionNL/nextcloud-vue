/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Counts on CnQuickFilterBar chips and CnSavedViewsControl entries.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

const { mount } = require('@vue/test-utils')
const CnQuickFilterBar = require('../../src/components/CnQuickFilterBar/CnQuickFilterBar.vue').default
const CnSavedViewsControl = require('../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue').default

const TABS = [
	{ label: 'Open', filter: { status: 'open' } },
	{ label: 'On hold', filter: { status: 'hold' } },
	{ label: 'Closed', filter: { status: 'closed' } },
]

describe('CnQuickFilterBar counts', () => {
	it('shows no count at all by default', () => {
		const wrapper = mount(CnQuickFilterBar, { propsData: { tabs: TABS, activeIndex: 0 } })
		expect(wrapper.findAll('[data-testid="cn-quick-filter-count"]')).toHaveLength(0)
		expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Open', 'On hold', 'Closed'])
	})

	it('shows a count only on the tabs that have one, zero included', () => {
		const wrapper = mount(CnQuickFilterBar, { propsData: { tabs: TABS, activeIndex: 0, counts: { 0: 12, 2: 0 } } })
		const tabs = wrapper.findAll('[role="tab"]')
		expect(tabs[0].find('[data-testid="cn-quick-filter-count"]').text()).toBe('12')
		expect(tabs[1].find('[data-testid="cn-quick-filter-count"]').exists()).toBe(false)
		expect(tabs[2].find('[data-testid="cn-quick-filter-count"]').text()).toBe('0')
	})

	it('makes the count part of the text a screen reader reads', () => {
		const wrapper = mount(CnQuickFilterBar, { propsData: { tabs: TABS, activeIndex: 0, counts: [12, null, 3] } })
		const tab = wrapper.findAll('[role="tab"]')[0]
		expect(tab.element.textContent.replace(/\s+/g, ' ').trim()).toBe('Open 12')
		expect(tab.find('[data-testid="cn-quick-filter-count"]').attributes('aria-hidden')).toBeUndefined()
		expect(tab.attributes('aria-label')).toBeUndefined()
	})

	it('reads a count the tab carries itself, and lets counts win over it', () => {
		const tabs = [{ label: 'Open', filter: {}, count: 4 }, { label: 'Closed', filter: {}, count: 9 }]
		const wrapper = mount(CnQuickFilterBar, { propsData: { tabs, activeIndex: 0, counts: { 1: 1 } } })
		expect(wrapper.findAll('[data-testid="cn-quick-filter-count"]').map((count) => count.text())).toEqual(['4', '1'])
	})

	it('ignores what is not a number', () => {
		const wrapper = mount(CnQuickFilterBar, { propsData: { tabs: TABS, activeIndex: 0, counts: { 0: '12', 1: NaN } } })
		expect(wrapper.findAll('[data-testid="cn-quick-filter-count"]')).toHaveLength(0)
	})

	it('shows the count in the overflow panel too', async () => {
		const wrapper = mount(CnQuickFilterBar, {
			propsData: { tabs: TABS, activeIndex: 0, maxVisible: 1, counts: { 0: 12, 2: 5 } },
		})
		await wrapper.find('[data-testid="cn-quick-filter-more"]').trigger('click')
		const items = wrapper.findAll('[data-testid="cn-quick-filter-more-item"]')
		expect(items).toHaveLength(2)
		expect(items[1].find('[data-testid="cn-quick-filter-count"]').text()).toBe('5')
	})

	it('puts the count in the dropdown label', () => {
		const wrapper = mount(CnQuickFilterBar, { propsData: { tabs: TABS, activeIndex: 0, mode: 'dropdown', counts: { 0: 12 } } })
		expect(wrapper.vm.dropdownOptions.map((option) => option.label)).toEqual(['Open (12)', 'On hold', 'Closed'])
	})
})

describe('CnSavedViewsControl counts', () => {
	const views = [
		{ id: 'v1', slug: 'mine', name: 'My cases', owner: 'alice' },
		{ id: 'v2', slug: 'late', name: 'Late', owner: 'alice' },
		{ id: 'v3', slug: 'carried', name: 'Carried', owner: 'alice', count: 7 },
		{ id: 'v4', slug: 'child', name: 'Child', owner: 'alice', parent: 'mine' },
	]
	const rows = (wrapper) => wrapper.findAll('[data-testid="cn-saved-views-item"]')
	const row = (wrapper, id) => rows(wrapper).find((item) => item.attributes('data-view-id') === id)

	it('shows names only by default', () => {
		const wrapper = mount(CnSavedViewsControl, { props: { views: views.slice(0, 2), currentUserId: 'alice' } })
		expect(rows(wrapper).map((item) => item.text()).sort()).toEqual(['Late', 'My cases'])
	})

	it('shows the count after the name, by id or by slug, zero included', () => {
		const wrapper = mount(CnSavedViewsControl, {
			props: { views, currentUserId: 'alice', counts: { v1: 14, late: 0 } },
		})
		expect(row(wrapper, 'v1').text()).toBe('My cases (14)')
		expect(row(wrapper, 'v2').text()).toBe('Late (0)')
	})

	it('reads a count the view carries itself', () => {
		const wrapper = mount(CnSavedViewsControl, { props: { views, currentUserId: 'alice' } })
		expect(row(wrapper, 'v3').text()).toBe('Carried (7)')
	})

	it('puts the count in the accessible label, nested rows included', () => {
		const wrapper = mount(CnSavedViewsControl, {
			props: { views, currentUserId: 'alice', counts: { v1: 14, v4: 2 } },
		})
		expect(row(wrapper, 'v1').attributes('aria-label')).toBe('My cases (14)')
		expect(row(wrapper, 'v4').attributes('aria-label')).toBe('Child (2), level 2')
	})
})
