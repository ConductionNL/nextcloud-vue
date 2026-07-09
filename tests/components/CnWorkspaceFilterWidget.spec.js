/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnWorkspaceFilterWidget (#91 Wave 3 — the `workspace-filter`
 * widget). Covers static + OR-source + endpointSource options, the
 * workspace-context write that makes sibling widgets refetch, the "All"
 * clear affordance, and the count display.
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p, params) => {
		let out = p
		for (const [k, v] of Object.entries(params || {})) out = out.replace(`{${k}}`, v)
		return `/nc${out}`
	}),
}))
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	__esModule: true,
	fetchEndpointSource: jest.fn(),
}))

import axios from '@nextcloud/axios'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'
import { fetchEndpointSource } from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountWidget(content, workspace) {
	return mount(CnWorkspaceFilterWidget, {
		propsData: { content },
		provide: { cnWorkspaceContext: workspace !== undefined ? workspace : ref({}) },
		stubs: {
			NcSelect: {
				name: 'NcSelect',
				props: ['value', 'options'],
				template: '<select class="nc-select-stub" @change="$emit(\'input\', options[$event.target.selectedIndex])"><option v-for="o in options" :key="o.value">{{ o.label }}</option></select>',
			},
			NcCheckboxRadioSwitch: {
				name: 'NcCheckboxRadioSwitch',
				props: ['checked', 'value'],
				template: '<label class="nc-radio-stub" v-bind="$attrs"><input type="radio" :checked="checked" @change="$emit(\'update:model-value\', value)" /><slot /></label>',
			},
		},
	})
}

describe('CnWorkspaceFilterWidget (#91 Wave 3)', () => {
	beforeEach(() => {
		axios.get.mockReset()
		fetchEndpointSource.mockReset()
	})

	it('renders static options and writes the picked value into the workspace context', async () => {
		const workspace = ref({})
		const wrapper = mountWidget({
			label: 'Queue',
			writes: '@workspace.queue',
			allLabel: 'All',
			options: [
				{ value: 'inbox', label: 'Inbox', count: 3 },
				{ value: 'done', label: 'Done', count: 8 },
			],
		}, workspace)
		await flush()

		// "All" + 2 options.
		expect(wrapper.findAll('.nc-radio-stub').length).toBe(3)
		// Counts render.
		expect(wrapper.text()).toContain('3')

		await wrapper.find('[data-testid="cn-workspace-filter-option-done"]').find('input').trigger('change')
		// The write lands under the bare key (prefix stripped).
		expect(workspace.value.queue).toBe('done')
		expect(wrapper.emitted('change')[0][0]).toEqual({ key: 'queue', value: 'done' })
	})

	it('the "All" option clears the key (empty string) so an optional sibling token drops', async () => {
		const workspace = ref({ queue: 'inbox' })
		const wrapper = mountWidget({
			writes: '@workspace.queue',
			allLabel: 'All',
			options: [{ value: 'inbox', label: 'Inbox' }],
		}, workspace)
		await flush()

		await wrapper.find('[data-testid="cn-workspace-filter-option-"]').find('input').trigger('change')
		expect(workspace.value.queue).toBe('')
	})

	it('builds options from an OpenRegister /grouped facet with counts', async () => {
		axios.get.mockResolvedValue({
			data: { groups: [{ key: 'open', value: 5 }, { key: 'closed', value: 2 }, { key: null, value: 9 }] },
		})
		const wrapper = mountWidget({
			label: 'Status',
			writes: '@workspace.status',
			source: { register: 'pipelinq', schema: 'werkitem', groupBy: 'status' },
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(axios.get).toHaveBeenCalledWith(
			'/nc/apps/openregister/api/objects/aggregations/pipelinq/werkitem/grouped',
			{ params: { groupBy: 'status', metric: 'count' } },
		)
		// null key filtered out; two real options.
		expect(wrapper.vm.normalisedOptions).toEqual([
			{ value: 'open', label: 'open', count: 5 },
			{ value: 'closed', label: 'closed', count: 2 },
		])
	})

	it('builds options from an endpointSource array', async () => {
		fetchEndpointSource.mockResolvedValue([
			{ value: 'a', label: 'Alpha', count: 1 },
			{ id: 'b', name: 'Beta' },
			'gamma',
		])
		const wrapper = mountWidget({
			writes: '@workspace.pick',
			endpointSource: { url: '/apps/x/api/options' },
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(fetchEndpointSource).toHaveBeenCalled()
		expect(wrapper.vm.normalisedOptions).toEqual([
			{ value: 'a', label: 'Alpha', count: 1 },
			{ value: 'b', label: 'Beta' },
			{ value: 'gamma', label: 'gamma' },
		])
	})

	it('adopts the first option as the default when no "All" option and nothing is set', async () => {
		const workspace = ref({})
		mountWidget({
			writes: '@workspace.queue',
			options: [{ value: 'inbox', label: 'Inbox' }, { value: 'done', label: 'Done' }],
		}, workspace)
		await flush()
		expect(workspace.value.queue).toBe('inbox')
	})

	it('seeds from an existing workspace value over the first-option default', async () => {
		const workspace = ref({ queue: 'done' })
		const wrapper = mountWidget({
			writes: '@workspace.queue',
			options: [{ value: 'inbox', label: 'Inbox' }, { value: 'done', label: 'Done' }],
		}, workspace)
		await flush()
		expect(wrapper.vm.selected).toBe('done')
		// Unchanged — the pre-existing selection wins.
		expect(workspace.value.queue).toBe('done')
	})
})
