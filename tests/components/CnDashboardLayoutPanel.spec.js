/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The dashboard layout panel (board PqMijnWerkIndelen): "Arrange page" opens
 * a side panel that lists the grid's sections; the user shows, hides and
 * reorders them, saves, or goes back to the default. The result is stored per
 * user, hidden sections are not drawn, and the page keeps its shape.
 *
 * @spec openspec/changes/dashboard-layout-panel/specs/dashboard-page/spec.md#requirement-a-user-arranges-the-page-in-a-side-panel
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@/composables/useUserPreferences.js', () => ({
	readUserPreference: jest.fn(async () => null),
	writeUserPreference: jest.fn(async () => true),
}))

import { mount } from '@vue/test-utils'
import CnDashboardLayoutPanel from '@/components/CnDashboardLayoutPanel/CnDashboardLayoutPanel.vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { writeUserPreference } from '@/composables/useUserPreferences.js'
import { mergeUserLayout, resolveUserLayoutApi } from '@/store/plugins/dashboardLayouts.js'

const ITEMS = [
	{ id: 'urgent', label: 'Urgent', hidden: false },
	{ id: 'waiting', label: 'Waiting on me', hidden: false },
	{ id: 'week', label: 'Your week', hidden: true },
]

describe('CnDashboardLayoutPanel', () => {
	it('lists the sections with their state, checked when shown', () => {
		const w = mount(CnDashboardLayoutPanel, { props: { items: ITEMS } })
		const rows = w.findAll('.cn-dashboard-layout-panel__item')
		expect(rows.map((r) => r.find('.cn-dashboard-layout-panel__name').text())).toEqual(['Urgent', 'Waiting on me', 'Your week'])
		expect(w.find('[data-testid="cn-dashboard-layout-panel-check-urgent"]').element.checked).toBe(true)
		expect(w.find('[data-testid="cn-dashboard-layout-panel-check-week"]').element.checked).toBe(false)
		expect(rows[2].find('.cn-dashboard-layout-panel__state').text()).toBe('Hidden')
		expect(w.find('h2').text()).toBe('Arrange this page')
	})

	it('moves a section with the arrow keys and saves the new order and visibility', async () => {
		const w = mount(CnDashboardLayoutPanel, { props: { items: ITEMS }, attachTo: document.body })
		await w.find('[data-testid="cn-dashboard-layout-panel-handle-waiting"]').trigger('keydown', { key: 'ArrowUp' })
		await w.find('[data-testid="cn-dashboard-layout-panel-check-week"]').setValue(true)
		await w.find('[data-testid="cn-dashboard-layout-panel-check-urgent"]').setValue(false)
		expect(w.find('[data-testid="cn-dashboard-layout-panel-live"]').text()).toBe('Waiting on me moved to position 1 of 3')
		await w.find('[data-testid="cn-dashboard-layout-panel-save"]').trigger('click')
		expect(w.emitted('save')[0][0]).toEqual([
			{ id: 'waiting', label: 'Waiting on me', hidden: false },
			{ id: 'urgent', label: 'Urgent', hidden: true },
			{ id: 'week', label: 'Your week', hidden: false },
		])
		w.unmount()
	})

	it('moves a dragged section onto the place it is dropped', async () => {
		const w = mount(CnDashboardLayoutPanel, { props: { items: ITEMS } })
		await w.find('[data-testid="cn-dashboard-layout-panel-handle-week"]').trigger('dragstart')
		await w.find('[data-testid="cn-dashboard-layout-panel-item-urgent"]').trigger('drop')
		await w.find('[data-testid="cn-dashboard-layout-panel-save"]').trigger('click')
		expect(w.emitted('save')[0][0].map((entry) => entry.id)).toEqual(['week', 'urgent', 'waiting'])
	})

	it('asks for the default and closes on request', async () => {
		const w = mount(CnDashboardLayoutPanel, { props: { items: ITEMS } })
		await w.find('[data-testid="cn-dashboard-layout-panel-reset"]').trigger('click')
		await w.find('[data-testid="cn-dashboard-layout-panel-close"]').trigger('click')
		await w.trigger('keydown', { key: 'Escape' })
		expect(w.emitted('reset')).toHaveLength(1)
		expect(w.emitted('close')).toHaveLength(2)
	})
})

describe('user layout records keep hidden widgets', () => {
	it('merges a stored hidden flag and writes it back', async () => {
		const manifest = [{ widgetId: 'a', gridX: 0, gridY: 0 }, { widgetId: 'b', gridX: 0, gridY: 1 }]
		const merged = mergeUserLayout(manifest, { items: [{ widgetId: 'b', gridY: 0, hidden: true }, { widgetId: 'a', gridY: 1 }] })
		expect(merged.map((item) => [item.widgetId, item.hidden === true])).toEqual([['b', true], ['a', false]])
	})

	it('writes the hidden flag through the default preference path', async () => {
		await resolveUserLayoutApi(null).save('pipelinq', 'MyWork', [{ widgetId: 'a', gridX: 0, title: 'A', hidden: true }, { widgetId: 'b', gridX: 1 }])
		expect(writeUserPreference).toHaveBeenCalledWith('pipelinq', 'dashboard-layout.MyWork', { items: [{ widgetId: 'a', gridX: 0, hidden: true }, { widgetId: 'b', gridX: 1 }] })
	})
})

/**
 * @return {object} A layout store double.
 */
function layoutStore() {
	return {
		loadDashboardLayout: jest.fn(async () => null),
		saveDashboardLayout: jest.fn(async () => true),
		resetDashboardLayout: jest.fn(async () => true),
	}
}

const stubs = {
	CnDashboardGrid: { template: '<div class="grid-stub" />', props: ['layout'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcEmptyContent: { template: '<div><slot /></div>' },
}

/**
 * @param {object} props Extra props.
 * @return {object} Wrapper.
 */
function mountPage(props = {}) {
	return mount(CnDashboardPage, {
		props: {
			title: 'My work',
			pageId: 'MyWork',
			appId: 'pipelinq',
			widgets: [
				{ id: 'urgent', title: 'Urgent', type: 'custom' },
				{ id: 'waiting', title: 'Waiting on me', type: 'custom' },
				{ id: 'side', title: 'Appointments', type: 'custom' },
			],
			layout: [
				{ id: '1', widgetId: 'urgent', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 3 },
				{ id: '2', widgetId: 'side', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 4 },
				{ id: '3', widgetId: 'waiting', gridX: 0, gridY: 3, gridWidth: 8, gridHeight: 2 },
			],
			...props,
		},
		global: { stubs },
		attachTo: document.body,
	})
}

describe('CnDashboardPage: layoutPanel', () => {
	it('draws no button and makes no layout request without the key', async () => {
		const store = layoutStore()
		const w = mountPage({ userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(w.find('[data-testid="cn-dashboard-page-layout-panel-button"]').exists()).toBe(false)
		expect(store.loadDashboardLayout).not.toHaveBeenCalled()
		w.unmount()
	})

	it('opens the panel listing the sections in reading order, and loads the user record', async () => {
		const store = layoutStore()
		const w = mountPage({ layoutPanel: true, userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))
		const button = w.find('[data-testid="cn-dashboard-page-layout-panel-button"]')
		expect(button.text()).toBe('Arrange page')
		expect(button.attributes('aria-expanded')).toBe('false')
		await button.trigger('click')
		expect(button.attributes('aria-expanded')).toBe('true')
		const panel = w.findComponent(CnDashboardLayoutPanel)
		expect(panel.props('items').map((entry) => entry.label)).toEqual(['Urgent', 'Appointments', 'Waiting on me'])
		expect(store.loadDashboardLayout).toHaveBeenCalledWith('pipelinq', 'MyWork')
		w.unmount()
	})

	it('saves the new order in the old places, hides a hidden section and closes the panel', async () => {
		const store = layoutStore()
		const w = mountPage({ layoutPanel: true, userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))
		await w.find('[data-testid="cn-dashboard-page-layout-panel-button"]').trigger('click')
		w.findComponent(CnDashboardLayoutPanel).vm.$emit('save', [
			{ id: 'waiting', hidden: false },
			{ id: 'urgent', hidden: false },
			{ id: 'side', hidden: true },
		])
		await new Promise((resolve) => setTimeout(resolve, 0))
		const saved = store.saveDashboardLayout.mock.calls[0][2]
		const waiting = saved.find((item) => item.widgetId === 'waiting')
		const urgent = saved.find((item) => item.widgetId === 'urgent')
		expect([waiting.gridX, waiting.gridY, waiting.gridWidth, waiting.gridHeight]).toEqual([0, 0, 8, 2])
		expect([urgent.gridX, urgent.gridY, urgent.gridWidth]).toEqual([8, 0, 4])
		expect(saved.find((item) => item.widgetId === 'side').hidden).toBe(true)
		expect(w.vm.renderedLayout.map((item) => item.widgetId)).toEqual(['waiting', 'urgent'])
		expect(w.findComponent(CnDashboardLayoutPanel).exists()).toBe(false)
		w.unmount()
	})

	it('goes back to the default from the panel', async () => {
		const store = layoutStore()
		const w = mountPage({ layoutPanel: true, userLayoutStore: store })
		await new Promise((resolve) => setTimeout(resolve, 0))
		await w.find('[data-testid="cn-dashboard-page-layout-panel-button"]').trigger('click')
		w.findComponent(CnDashboardLayoutPanel).vm.$emit('reset')
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(store.resetDashboardLayout).toHaveBeenCalledWith('pipelinq', 'MyWork')
		w.unmount()
	})
})
