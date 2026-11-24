/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A workspace-filter select can take several values (`multiple: true`,
 * written comma-joined), and a bar can say how many filters are set
 * ("Filters (N)") and clear them in one go (`clear`), as board PqMijnWerk
 * draws My work's priority and pipeline filters.
 *
 * @spec openspec/changes/workspace-filter-multi-and-clear/tasks.md#task-1
 * @spec openspec/changes/workspace-filter-multi-and-clear/tasks.md#task-2
 */

import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'

const PRIORITIES = [
	{ value: 'urgent', label: 'Urgent' },
	{ value: 'high', label: 'High' },
	{ value: 'normal', label: 'Normal' },
	{ value: 'low', label: 'Low' },
]

const BAR = {
	layout: 'bar',
	clear: {},
	controls: [
		{ style: 'chips', writes: '@workspace.lens', urlKey: 'lens', default: 'all', filter: true, options: [{ value: 'all', label: 'All' }, { value: 'tickets', label: 'Tickets' }] },
		{ style: 'select', multiple: true, writes: '@workspace.priority', urlKey: 'priority', filter: true, options: PRIORITIES },
		{ style: 'select', writes: '@workspace.pipeline', urlKey: 'pipeline', filter: true, allLabel: 'All pipelines', options: [{ value: 'p1', label: 'Sales' }] },
		{ style: 'select', writes: '@workspace.sort', urlKey: 'sort', default: 'deadline', options: [{ value: 'deadline', label: 'Deadline' }, { value: 'newest', label: 'Newest' }] },
	],
}

/**
 * @param {object} content The widget content.
 * @param {object} start The workspace to start from.
 * @param {object} query The address query.
 * @return {{wrapper: object, workspace: object, router: object}}
 */
function mountFilter(content, start = {}, query = {}) {
	const workspace = ref({ ...start })
	const router = { replace: jest.fn(() => Promise.resolve()) }
	const wrapper = mount(CnWorkspaceFilterWidget, {
		props: { content },
		global: {
			provide: { cnWorkspaceContext: workspace, cnTranslate: (key) => key },
			mocks: { $route: { query }, $router: router },
			stubs: {
				NcSelect: {
					props: ['modelValue', 'options', 'multiple', 'clearable'],
					emits: ['update:modelValue'],
					template: '<div class="select" :data-multiple="String(multiple)" :data-clearable="String(clearable)" />',
				},
				CnSegmentedControl: { props: ['modelValue', 'options'], template: '<div class="chips" />' },
				NcButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
			},
		},
	})
	return { wrapper, workspace, router }
}

describe('a multiple workspace-filter select', () => {
	const PRIORITY = { style: 'select', multiple: true, writes: '@workspace.priority', urlKey: 'priority', options: PRIORITIES }

	it('draws a clearable multiple select and writes the picks comma-joined', async () => {
		const { wrapper, workspace } = mountFilter(PRIORITY)
		await flushPromises()
		const select = wrapper.find('.select')
		expect(select.attributes('data-multiple')).toBe('true')
		expect(select.attributes('data-clearable')).toBe('true')

		wrapper.vm.onSelect([PRIORITIES[0], PRIORITIES[1]])
		expect(workspace.value.priority).toBe('urgent,high')
		expect(wrapper.vm.selectedOptions.map((option) => option.value)).toEqual(['urgent', 'high'])

		wrapper.vm.onSelect([])
		expect(workspace.value.priority).toBe('')
	})

	it('reads several values from the address and drops unknown ones', async () => {
		const { wrapper, workspace } = mountFilter(PRIORITY, {}, { priority: 'urgent,bogus,high' })
		await flushPromises()
		expect(wrapper.vm.selected).toBe('urgent,high')
		expect(workspace.value.priority).toBe('urgent,high')
	})

	it('does not pick a first value by itself', async () => {
		const { workspace } = mountFilter(PRIORITY)
		await flushPromises()
		expect(workspace.value.priority).toBeUndefined()
	})

	it('leaves a single select as it was', async () => {
		const { wrapper } = mountFilter({ ...PRIORITY, multiple: undefined })
		await flushPromises()
		expect(wrapper.find('.select').attributes('data-multiple')).toBe('false')
	})
})

describe('a bar that clears its filters', () => {
	it('counts each set filter, each value of a multiple select, and not the sorting', async () => {
		const { wrapper } = mountFilter(BAR, { lens: 'tickets', priority: 'urgent,high', pipeline: 'p1', sort: 'newest' })
		await flushPromises()
		expect(wrapper.vm.activeFilterCount).toBe(4)
		expect(wrapper.find('[data-testid="cn-workspace-filter-active-count"]').text()).toBe('Filters (4)')
		expect(wrapper.find('[data-testid="cn-workspace-filter-clear-button"]').text()).toBe('Clear filters')
	})

	it('shows nothing while every filter is on its default', async () => {
		const { wrapper } = mountFilter(BAR, { lens: 'all', priority: '', sort: 'newest' })
		await flushPromises()
		expect(wrapper.vm.activeFilterCount).toBe(0)
		expect(wrapper.find('[data-testid="cn-workspace-filter-clear"]').exists()).toBe(false)
	})

	it('Clear filters returns to all types, all priorities and all pipelines, and keeps the sorting', async () => {
		const { wrapper, workspace, router } = mountFilter(
			BAR,
			{ lens: 'tickets', priority: 'urgent', pipeline: 'p1', sort: 'newest' },
			{ lens: 'tickets', priority: 'urgent', sort: 'newest' },
		)
		await flushPromises()
		router.replace.mockClear()
		await wrapper.find('[data-testid="cn-workspace-filter-clear-button"]').trigger('click')
		await flushPromises()

		expect(workspace.value).toMatchObject({ lens: 'all', priority: '', pipeline: '', sort: 'newest' })
		expect(router.replace).toHaveBeenCalledWith({ query: { lens: 'all', sort: 'newest' } })
		expect(wrapper.find('[data-testid="cn-workspace-filter-clear"]').exists()).toBe(false)
	})

	it('takes its own labels', async () => {
		const { wrapper } = mountFilter({ ...BAR, clear: { label: 'Reset', countLabel: '{count} set' } }, { priority: 'low' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-workspace-filter-active-count"]').text()).toBe('1 set')
		expect(wrapper.find('[data-testid="cn-workspace-filter-clear-button"]').text()).toBe('Reset')
	})
})
