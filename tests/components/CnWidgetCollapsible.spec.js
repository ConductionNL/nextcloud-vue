/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget can fold to its header (`collapsible: true` on its definition),
 * and a page that keeps a per-user layout stores the folded state with it,
 * so the widget is still folded after a reload (pipelinq My work, REQ-MW-110
 * "Collapsed stays collapsed").
 *
 * @spec openspec/changes/widget-collapsible-section/specs/dashboard-page/spec.md#requirement-a-widget-can-fold-to-its-header
 * @spec openspec/changes/widget-collapsible-section/specs/dashboard-page/spec.md#requirement-a-folded-widget-stays-folded-for-that-user
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import CnWidgetWrapper from '@/components/CnWidgetWrapper/CnWidgetWrapper.vue'
import { mergeUserLayout } from '@/store/plugins/dashboardLayouts.js'

describe('CnWidgetWrapper collapsible', () => {
	it('draws no chevron on a card that is not collapsible', () => {
		const w = mount(CnWidgetWrapper, { props: { title: 'Recent activity', showActions: false }, slots: { default: '<p class="body">x</p>' } })
		expect(w.find('[data-testid="cn-widget-wrapper-collapse"]').exists()).toBe(false)
		expect(w.find('.cn-widget-wrapper__content').isVisible()).toBe(true)
	})

	it('draws a chevron that says the card is open, and asks to fold it', async () => {
		const w = mount(CnWidgetWrapper, { props: { title: 'Recent activity', showActions: false, collapsible: true }, slots: { default: '<p class="body">x</p>' } })
		const button = w.find('[data-testid="cn-widget-wrapper-collapse"]')
		expect(button.exists()).toBe(true)
		expect(button.attributes('aria-expanded')).toBe('true')
		expect(button.attributes('aria-controls')).toBe(w.find('.cn-widget-wrapper__content').attributes('id'))
		expect(button.attributes('aria-label')).toBe('Collapse Recent activity')

		await button.trigger('click')
		expect(w.emitted('toggle-collapse')).toEqual([[true]])
	})

	it('shows only the header when folded, and asks to open it again', async () => {
		const w = mount(CnWidgetWrapper, {
			props: { title: 'Recent activity', showActions: false, collapsible: true, collapsed: true },
			slots: { default: '<p class="body">x</p>', footer: '<a class="foot">all</a>' },
		})
		expect(w.classes()).toContain('cn-widget-wrapper--collapsed')
		expect(w.find('.cn-widget-wrapper__header').exists()).toBe(true)
		expect(w.find('.cn-widget-wrapper__content').isVisible()).toBe(false)
		expect(w.find('.foot').exists()).toBe(false)
		const button = w.find('[data-testid="cn-widget-wrapper-collapse"]')
		expect(button.attributes('aria-expanded')).toBe('false')
		expect(button.attributes('aria-label')).toBe('Expand Recent activity')

		await button.trigger('click')
		expect(w.emitted('toggle-collapse')).toEqual([[false]])
	})

	it('ignores collapsed without collapsible', () => {
		const w = mount(CnWidgetWrapper, { props: { title: 'Recent activity', showActions: false, collapsed: true }, slots: { default: '<p class="body">x</p>' } })
		expect(w.find('.cn-widget-wrapper__content').isVisible()).toBe(true)
		expect(w.classes()).not.toContain('cn-widget-wrapper--collapsed')
	})
})

describe('the user layout record keeps the folded state', () => {
	it('merges a stored collapsed entry over the manifest, and nothing else', () => {
		const merged = mergeUserLayout(
			[{ widgetId: 'a', gridX: 0 }, { widgetId: 'b', gridX: 4 }],
			{ items: [{ widgetId: 'a', gridX: 0, collapsed: true }, { widgetId: 'b', gridX: 4, collapsed: 'yes' }] },
		)
		expect(merged.find((i) => i.widgetId === 'a').collapsed).toBe(true)
		expect(merged.find((i) => i.widgetId === 'b').collapsed).toBeUndefined()
	})
})

/**
 * A layout store double recording what it saves.
 *
 * @param {object|null} record What `load` answers.
 * @return {object} The store.
 */
function layoutStore(record = null) {
	return {
		loadDashboardLayout: jest.fn(async () => record),
		saveDashboardLayout: jest.fn(async () => true),
		resetDashboardLayout: jest.fn(async () => true),
	}
}

/**
 * Mount a page with one collapsible and one plain widget.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	return mount(CnDashboardPage, {
		props: {
			title: 'My work',
			pageId: 'MyWork',
			widgets: [
				{ id: 'activity', title: 'Recent activity', type: 'custom', collapsible: true },
				{ id: 'tasks', title: 'Tasks', type: 'custom' },
			],
			layout: [
				{ id: '1', widgetId: 'activity', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 },
				{ id: '2', widgetId: 'tasks', gridX: 4, gridY: 0, gridWidth: 4, gridHeight: 3 },
			],
			...props,
		},
		global: {
			stubs: {
				CnDashboardGrid: { template: '<div class="grid-stub" />', props: ['layout'] },
				NcButton: { template: '<button><slot /></button>' },
				NcEmptyContent: { template: '<div><slot /></div>' },
			},
		},
	})
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CnDashboardPage collapsible widgets', () => {
	it('reads collapsible from the widget definition or the layout entry', () => {
		const page = mountPage()
		expect(page.vm.isWidgetCollapsible({ widgetId: 'activity' })).toBe(true)
		expect(page.vm.isWidgetCollapsible({ widgetId: 'tasks' })).toBe(false)
		expect(page.vm.isWidgetCollapsible({ widgetId: 'tasks', collapsible: true })).toBe(true)
		expect(page.vm.isWidgetCollapsible({ widgetId: 'activity', collapsible: false })).toBe(false)
	})

	it('starts open, and draws the folded state the stored layout says', async () => {
		expect(mountPage().vm.isWidgetCollapsed({ widgetId: 'activity' })).toBe(false)

		const store = layoutStore({ items: [{ widgetId: 'activity', gridX: 0, collapsed: true }] })
		const page = mountPage({ layoutPanel: true, appId: 'pipelinq', userLayoutStore: store })
		await tick()
		expect(page.vm.isWidgetCollapsed({ widgetId: 'activity' })).toBe(true)
		// A widget that is not collapsible never reads as folded.
		expect(page.vm.isWidgetCollapsed({ widgetId: 'tasks', collapsed: true })).toBe(false)
	})

	it('stores a fold with the user layout, so a reload keeps it', async () => {
		const store = layoutStore(null)
		const page = mountPage({ layoutPanel: true, appId: 'pipelinq', userLayoutStore: store })
		await tick()

		await page.vm.onWidgetToggleCollapse({ widgetId: 'activity' }, true)
		expect(page.vm.isWidgetCollapsed({ widgetId: 'activity' })).toBe(true)
		expect(store.saveDashboardLayout).toHaveBeenCalledTimes(1)
		const [appId, pageId, items] = store.saveDashboardLayout.mock.calls[0]
		expect([appId, pageId]).toEqual(['pipelinq', 'MyWork'])
		expect(items.find((i) => i.widgetId === 'activity').collapsed).toBe(true)
		expect(items.find((i) => i.widgetId === 'tasks').collapsed).toBeUndefined()

		await page.vm.onWidgetToggleCollapse({ widgetId: 'activity' }, false)
		const reopened = store.saveDashboardLayout.mock.calls[1][2]
		expect(reopened.find((i) => i.widgetId === 'activity').collapsed).toBeUndefined()
		expect(page.vm.isWidgetCollapsed({ widgetId: 'activity' })).toBe(false)
	})

	it('folds for this visit only on a page without a user layout', async () => {
		const store = layoutStore(null)
		const page = mountPage({ appId: 'pipelinq', userLayoutStore: store })
		await page.vm.onWidgetToggleCollapse({ widgetId: 'activity' }, true)
		expect(page.vm.isWidgetCollapsed({ widgetId: 'activity' })).toBe(true)
		expect(store.saveDashboardLayout).not.toHaveBeenCalled()
	})

	it('opens every folded widget again on Back to default', async () => {
		const store = layoutStore({ items: [{ widgetId: 'activity', gridX: 0, collapsed: true }] })
		const page = mountPage({ layoutPanel: true, appId: 'pipelinq', userLayoutStore: store })
		await tick()
		await page.vm.onWidgetToggleCollapse({ widgetId: 'activity' }, true)

		await page.vm.resetUserLayout()
		expect(page.vm.isWidgetCollapsed({ widgetId: 'activity' })).toBe(false)
	})
})
