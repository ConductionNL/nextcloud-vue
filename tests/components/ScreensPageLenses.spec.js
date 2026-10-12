/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-page-lenses: a workspace filter drawn as chips with counts, its
 * choice in the address, and dashboard widgets that a workspace value shows or
 * hides (the "Alle / Tickets / Leads / Opvolgingen" strip of Mijn werk).
 *
 * @spec openspec/changes/screens-page-lenses/specs/page-lenses/spec.md
 */

import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import CnWorkspaceFilterWidget from '@/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { fetchListTotal } from '@/utils/fetchFilterCounts.js'
import { compareVisibleWhen, evaluateVisibleWhen, evaluateWorkspaceCondition, isWorkspaceCondition } from '@/utils/visibleWhen.js'

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@/utils/fetchFilterCounts.js', () => ({
	...jest.requireActual('@/utils/fetchFilterCounts.js'),
	fetchListTotal: jest.fn(),
}))

const LENS = {
	style: 'chips',
	label: 'Show',
	writes: '@workspace.lens',
	urlKey: 'lens',
	default: 'all',
	options: [
		{ value: 'all', label: 'All', countFrom: [{ register: 'r', schema: 'ticket' }, { register: 'r', schema: 'lead' }] },
		{ value: 'tickets', label: 'Tickets', countFrom: { register: 'r', schema: 'ticket', filter: { assignee: '@me' } } },
		{ value: 'leads', label: 'Leads', count: 4 },
	],
}

/**
 * @param {object} content widget content
 * @param {object} extra extra global options
 * @return {object} wrapper
 */
function mountChips(content = LENS, extra = {}) {
	const workspace = ref({})
	const wrapper = mount(CnWorkspaceFilterWidget, {
		props: { content },
		global: { provide: { cnWorkspaceContext: workspace, cnTranslate: (key) => key }, ...extra },
	})
	return { wrapper, workspace }
}

describe('workspace-filter chips', () => {
	beforeEach(() => {
		fetchListTotal.mockReset()
		fetchListTotal.mockImplementation(async (register, schema) => (schema === 'ticket' ? 7 : 2))
	})

	it('draws a compact radio group with a count after each label', async () => {
		const { wrapper } = mountChips()
		await flushPromises()
		const group = wrapper.find('[data-testid="cn-workspace-filter-chips"]')
		expect(group.exists()).toBe(true)
		expect(group.classes()).toContain('cn-segmented-control--compact')
		expect(group.attributes('aria-label')).toBe('Show')
		const buttons = group.findAll('button')
		expect(buttons.map((b) => b.text().replace(/\s+/g, ' '))).toEqual(['All 9', 'Tickets 7', 'Leads 4'])
	})

	it('shows no count for an option whose count failed', async () => {
		fetchListTotal.mockRejectedValue(new Error('x'))
		const { wrapper } = mountChips()
		await flushPromises()
		expect(wrapper.findAll('button')[0].text()).toBe('All')
		expect(wrapper.findAll('button')[2].text().replace(/\s+/g, ' ')).toBe('Leads 4')
	})

	it('writes the default into the workspace, and a click writes the choice', async () => {
		const { wrapper, workspace } = mountChips()
		await flushPromises()
		expect(workspace.value.lens).toBe('all')
		await wrapper.findAll('button')[1].trigger('click')
		expect(workspace.value.lens).toBe('tickets')
		expect(wrapper.findAll('button')[1].attributes('aria-checked')).toBe('true')
	})

	it('keeps the choice in the address and lets the address win over the default', async () => {
		const replace = jest.fn(() => Promise.resolve())
		const $route = { query: { lens: 'leads', other: '1' } }
		const { wrapper, workspace } = mountChips(LENS, { mocks: { $route, $router: { replace } } })
		await flushPromises()
		expect(workspace.value.lens).toBe('leads')
		await wrapper.findAll('button')[1].trigger('click')
		expect(replace).toHaveBeenCalledWith({ query: { lens: 'tickets', other: '1' } })
	})

	it('ignores an address value that names no option', async () => {
		const { workspace } = mountChips(LENS, { mocks: { $route: { query: { lens: 'nope' } }, $router: { replace: jest.fn() } } })
		await flushPromises()
		expect(workspace.value.lens).toBe('all')
	})

	it('moves the choice with the arrow keys', async () => {
		const { wrapper, workspace } = mountChips()
		await flushPromises()
		await wrapper.find('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
		expect(workspace.value.lens).toBe('tickets')
	})

	it('keeps the radio list when the style is not chips', async () => {
		const { wrapper } = mountChips({ ...LENS, style: undefined })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-workspace-filter-chips"]').exists()).toBe(false)
	})
})

describe('visibleWhen workspace mode', () => {
	it('recognises a workspace condition and nothing else', () => {
		expect(isWorkspaceCondition({ workspace: 'lens', value: 'x' })).toBe(true)
		expect(isWorkspaceCondition({ workspace: 'lens', source: { register: 'r', schema: 's' } })).toBe(false)
		expect(isWorkspaceCondition({ field: 'a' })).toBe(false)
		expect(isWorkspaceCondition(null)).toBe(false)
	})

	it('compares the key, with eq, neq, in and empty', () => {
		const bag = { lens: 'tickets' }
		expect(evaluateWorkspaceCondition({ workspace: 'lens', value: 'tickets' }, bag)).toBe(true)
		expect(evaluateWorkspaceCondition({ workspace: 'lens', op: 'neq', value: 'tickets' }, bag)).toBe(false)
		expect(evaluateWorkspaceCondition({ workspace: 'lens', op: 'in', value: ['all', 'tickets'] }, bag)).toBe(true)
		expect(evaluateWorkspaceCondition({ workspace: 'lens', op: 'in', value: ['all', 'leads'] }, bag)).toBe(false)
		expect(evaluateWorkspaceCondition({ workspace: 'other', op: 'empty' }, bag)).toBe(true)
		expect(evaluateWorkspaceCondition({ workspace: 'lens', value: 'x' }, undefined)).toBe(false)
	})

	it('answers through evaluateVisibleWhen without a fetch', async () => {
		await expect(evaluateVisibleWhen({ workspace: 'lens', value: 'a' }, { workspace: { lens: 'a' } })).resolves.toBe(true)
		await expect(evaluateVisibleWhen({ workspace: 'lens', value: 'a' }, { workspace: {} })).resolves.toBe(false)
	})

	it('in takes a scalar as a one-item list', () => {
		expect(compareVisibleWhen('a', 'in', 'a')).toBe(true)
	})
})

describe('CnDashboardPage hides widgets by a workspace value', () => {
	const renderer = { template: '<div class="rend" />' }
	registerDashboardWidget('test-lens-widget', { renderer, form: {}, defaultContent: {}, displayName: 'L', icon: 'X' })

	const stubs = {
		CnDashboardGrid: {
			template: '<div><div v-for="it in layout" :key="it.id" class="cell" :data-wid="it.widgetId" :data-y="it.gridY"><slot name="widget" :item="it" /></div></div>',
			props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
		},
		CnKpiGrid: { template: '<div class="kpi"><slot /></div>' },
		CnWidgetWrapper: { props: ['flush', 'showTitle', 'title'], template: '<div class="ww"><slot /></div>' },
		NcButton: { template: '<button><slot /></button>' },
		NcEmptyContent: { template: '<div />' },
		NcLoadingIcon: { template: '<div class="loading" />' },
	}

	/**
	 * @param {boolean} [editing] whether the page is in edit mode
	 * @return {object} wrapper
	 */
	function mountPage() {
		return mount(CnDashboardPage, {
			propsData: {
				kpiRow: ['tile-tickets'],
				widgets: [
					{ id: 'tile-tickets', type: 'test-lens-widget', visibleWhen: { workspace: 'lens', op: 'in', value: ['all', 'tickets'] } },
					{ id: 'tickets', type: 'test-lens-widget', visibleWhen: { workspace: 'lens', op: 'in', value: ['all', 'tickets'] } },
					{ id: 'leads', type: 'test-lens-widget', visibleWhen: { workspace: 'lens', op: 'in', value: ['all', 'leads'] } },
					{ id: 'always', type: 'test-lens-widget' },
				],
				layout: [
					{ id: '1', widgetId: 'tickets', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 },
					{ id: '2', widgetId: 'leads', gridX: 0, gridY: 4, gridWidth: 12, gridHeight: 4 },
					{ id: '3', widgetId: 'always', gridX: 0, gridY: 8, gridWidth: 12, gridHeight: 4 },
				],
			},
			stubs,
		})
	}

	const cells = (w) => w.findAll('.cell').map((c) => [c.attributes('data-wid'), c.attributes('data-y')])

	it('shows a widget only while its condition holds, closes the gap and follows the key live', async () => {
		const wrapper = mountPage()
		await flushPromises()
		// Nothing wrote the key yet: every widget with a condition on it is absent.
		expect(cells(wrapper)).toEqual([['always', '0']])
		wrapper.vm.workspaceContext.lens = 'tickets'
		await flushPromises()
		expect(cells(wrapper)).toEqual([['tickets', '0'], ['always', '4']])
		wrapper.vm.workspaceContext.lens = 'leads'
		await flushPromises()
		expect(cells(wrapper)).toEqual([['leads', '0'], ['always', '4']])
		wrapper.vm.workspaceContext.lens = 'all'
		await flushPromises()
		expect(cells(wrapper).map((c) => c[0])).toEqual(['tickets', 'leads', 'always'])
	})

	it('hides a KPI-row tile the same way', async () => {
		const wrapper = mountPage()
		await flushPromises()
		expect(wrapper.findAll('[data-testid="cn-dashboard-page-kpi-tile-tickets"]')).toHaveLength(0)
		wrapper.vm.workspaceContext.lens = 'all'
		await flushPromises()
		expect(wrapper.findAll('[data-testid="cn-dashboard-page-kpi-tile-tickets"]')).toHaveLength(1)
	})
})
