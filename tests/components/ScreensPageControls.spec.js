/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-page-controls: a switch and a select that the page's lists listen
 * to ("Toon afgerond", "Sortering"), and a bar that holds them with the chips.
 *
 * @spec openspec/changes/screens-page-controls/specs/page-controls/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnRecordListWidget from '@/components/CnRecordListWidget/CnRecordListWidget.vue'
import CnWorkspaceFilterWidget from '@/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'
import { isOn, pageFilter, pageSort } from '@/utils/pageControls.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path, vars) => path.replace(/\{(\w+)\}/g, (_, k) => vars[k]) }))
jest.mock('@/utils/fetchFilterCounts.js', () => ({
	...jest.requireActual('@/utils/fetchFilterCounts.js'),
	fetchListTotal: jest.fn(async () => 3),
}))

const PAGE_CONTROLS = {
	sort: { key: 'sort', map: { deadline: { field: 'slaDeadline', dir: 'asc' }, priority: { field: 'priority', dir: 'desc' } } },
	toggle: { key: 'showDone', removes: ['status'] },
}

describe('pageControls util', () => {
	it('reads on values', () => {
		expect([true, 1, '1', 'true'].every(isOn)).toBe(true)
		expect([false, 0, '', 'no', undefined, null].some(isOn)).toBe(false)
	})

	it('picks the sort from the map and keeps the own sort for an unknown value', () => {
		const own = { field: 'title', dir: 'asc' }
		expect(pageSort(PAGE_CONTROLS, { sort: 'priority' }, own)).toEqual({ field: 'priority', dir: 'desc' })
		expect(pageSort(PAGE_CONTROLS, { sort: 'nope' }, own)).toBe(own)
		expect(pageSort(PAGE_CONTROLS, {}, own)).toBe(own)
		expect(pageSort(null, { sort: 'priority' }, own)).toBe(own)
	})

	it('drops the filter keys while the toggle is on, and never mutates the filter', () => {
		const filter = { assignee: '@me', status: { in: ['new'] } }
		expect(pageFilter(PAGE_CONTROLS, { showDone: false }, filter)).toBe(filter)
		expect(pageFilter(PAGE_CONTROLS, { showDone: true }, filter)).toEqual({ assignee: '@me' })
		expect(filter.status).toBeDefined()
		expect(pageFilter(null, { showDone: true }, filter)).toBe(filter)
	})
})

describe('CnRecordListWidget listens to the page controls', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
	})

	/**
	 * @param {object} workspace the workspace ref
	 * @param {object} extra extra content
	 * @return {object} wrapper
	 */
	function mountList(workspace, extra = {}) {
		return mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 'ticket', filter: { assignee: '@me', status: { in: ['new'] } }, sort: { field: 'title', dir: 'asc' }, pageControls: PAGE_CONTROLS, ...extra } },
			global: { provide: { cnWorkspaceContext: workspace }, stubs: { NcLoadingIcon: true } },
		})
	}

	it('sorts by the chosen entry and fetches again when the control changes', async () => {
		const workspace = ref({ sort: 'deadline' })
		mountList(workspace)
		await flushPromises()
		expect(axios.get.mock.calls[0][1].params['_order[slaDeadline]']).toBe('asc')
		workspace.value = { sort: 'priority' }
		await flushPromises()
		const last = axios.get.mock.calls.at(-1)[1].params
		expect(last['_order[priority]']).toBe('desc')
		expect(last['_order[slaDeadline]']).toBeUndefined()
	})

	it('removes the status filter while "show completed" is on, and puts it back', async () => {
		const workspace = ref({ showDone: false })
		mountList(workspace)
		await flushPromises()
		expect(axios.get.mock.calls[0][1].params['status[in]']).toEqual(['new'])
		workspace.value = { showDone: true }
		await flushPromises()
		expect(Object.keys(axios.get.mock.calls.at(-1)[1].params)).not.toContain('status[in]')
		workspace.value = { showDone: false }
		await flushPromises()
		expect(axios.get.mock.calls.at(-1)[1].params['status[in]']).toEqual(['new'])
	})

	it('without pageControls ignores the workspace', async () => {
		mountList(ref({ sort: 'priority', showDone: true }), { pageControls: undefined })
		await flushPromises()
		const params = axios.get.mock.calls[0][1].params
		expect(params['_order[title]']).toBe('asc')
		expect(params['status[in]']).toBeDefined()
	})
})

describe('workspace-filter toggle and bar', () => {
	/**
	 * @param {object} content widget content
	 * @param {object} extra extra global options
	 * @return {{wrapper: object, workspace: object}} mounted
	 */
	function mountFilter(content, extra = {}) {
		const workspace = ref({})
		const wrapper = mount(CnWorkspaceFilterWidget, {
			props: { content },
			global: {
				provide: { cnWorkspaceContext: workspace, cnTranslate: (key) => `T(${key})` },
				stubs: {
					NcCheckboxRadioSwitch: {
						props: ['modelValue', 'type'],
						emits: ['update:modelValue'],
						template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>',
					},
					NcSelect: { template: '<div class="select-stub" />' },
				},
				...extra,
			},
		})
		return { wrapper, workspace }
	}

	const TOGGLE = { style: 'toggle', label: 'Show completed', writes: '@workspace.showDone', urlKey: 'done' }

	it('starts off, says so in the workspace, and a click writes on and off', async () => {
		const { wrapper, workspace } = mountFilter(TOGGLE)
		await flushPromises()
		expect(workspace.value.showDone).toBe(false)
		const input = wrapper.find('[data-testid="cn-workspace-filter-toggle"] input')
		expect(input.attributes('type')).toBe('checkbox')
		expect(wrapper.text()).toContain('T(Show completed)')
		await input.setValue(true)
		expect(workspace.value.showDone).toBe(true)
		await input.setValue(false)
		expect(workspace.value.showDone).toBe(false)
	})

	it('writes custom on and off values', async () => {
		const { wrapper, workspace } = mountFilter({ ...TOGGLE, onValue: 'all', offValue: 'open' })
		await flushPromises()
		expect(workspace.value.showDone).toBe('open')
		await wrapper.find('input').setValue(true)
		expect(workspace.value.showDone).toBe('all')
	})

	it('reads the toggle from the address', async () => {
		const { workspace } = mountFilter(TOGGLE, { mocks: { $route: { query: { done: 'true' } }, $router: { replace: jest.fn() } } })
		await flushPromises()
		expect(workspace.value.showDone).toBe(true)
	})

	it('a bar draws its controls side by side, each writing its own key', async () => {
		const { wrapper, workspace } = mountFilter({
			layout: 'bar',
			controls: [
				{ style: 'chips', label: 'Show', writes: '@workspace.lens', default: 'all', options: [{ value: 'all', label: 'All' }, { value: 'x', label: 'X' }] },
				{ style: 'toggle', label: 'Show completed', writes: '@workspace.showDone', align: 'end' },
				{ style: 'select', label: 'Sort', writes: '@workspace.sort', default: 'deadline', options: [{ value: 'deadline', label: 'Deadline first' }] },
			],
		})
		await flushPromises()
		await nextTick()
		expect(wrapper.classes()).toContain('cn-workspace-filter-widget--bar')
		expect(wrapper.find('[data-testid="cn-workspace-filter-chips"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-workspace-filter-toggle"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-workspace-filter-select"]').exists()).toBe(true)
		// The bar itself draws no radio list.
		expect(wrapper.findAll('[role="radiogroup"]')).toHaveLength(1)
		expect(wrapper.findAll('.cn-workspace-filter-widget--inline')).toHaveLength(3)
		expect(wrapper.find('.cn-workspace-filter-widget--end').exists()).toBe(true)
		expect(workspace.value).toEqual({ lens: 'all', showDone: false, sort: 'deadline' })
	})
})
