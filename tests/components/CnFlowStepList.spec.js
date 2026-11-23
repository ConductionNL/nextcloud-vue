/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowStepList from '../../src/components/CnFlowDetail/CnFlowStepList.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const CATALOG = [
	{ id: 'openregister.trigger-object', displayName: 'Object changed', role: 'trigger' },
	{ id: 'openregister.switch', displayName: 'Switch', role: 'step' },
	{ id: 'openregister.send-mail', displayName: 'Send mail', role: 'step' },
	{ id: 'openregister.end', displayName: 'End', role: 'end' },
]

const FLOW = {
	lifecycleStatus: 'draft',
	nodes: [
		{ id: 't', type: 'openregister.trigger-object', start: true },
		{ id: 'c', type: 'openregister.switch', name: 'Large amount?', exits: [{ id: 'large', condition: { '>': [{ var: 'json.amount' }, 1000] } }, { id: 'small' }] },
		{ id: 'm', type: 'openregister.send-mail', name: 'Tell the controller', y: 1 },
		{ id: 'n', type: 'openregister.send-mail', y: 2 },
		{ id: 'e', type: 'openregister.end' },
	],
	edges: [
		{ from: 't', to: 'c' },
		{ from: 'c', fromExit: 'large', to: 'm' },
		{ from: 'c', fromExit: 'small', to: 'n' },
		{ from: 'm', to: 'e' },
		{ from: 'n', to: 'e' },
	],
}

/**
 * @param {object} [props] The list's props.
 * @param {object} [flow] The flow.
 * @return {Promise<object>} The mounted list over a seeded store.
 */
async function listOf(props = {}, flow = FLOW) {
	setActivePinia(createPinia())
	const wrapper = mount(CnFlowStepList, { props })
	Object.assign(wrapper.vm.store, { nodeCatalog: CATALOG, flow: JSON.parse(JSON.stringify(flow)) })
	await wrapper.vm.$nextTick()

	return wrapper
}

const rows = (wrapper) => wrapper.findAll('[data-testid="flow-step-row"]')

describe('CnFlowStepList', () => {
	it('draws the trigger, then the steps in run order', async () => {
		const wrapper = await listOf()

		expect(wrapper.find('[data-testid="flow-step-trigger"]').text()).toContain('Object changed')
		expect(rows(wrapper).map((row) => row.find('strong').text())).toEqual(['Large amount?', 'Tell the controller', 'Send mail', 'End'])
	})

	it('shows the conditions of a branch as readable text', async () => {
		const wrapper = await listOf()

		expect(rows(wrapper)[1].find('[data-testid="flow-step-when"]').text()).toBe('Only if amount is more than 1000')
		expect(rows(wrapper)[2].find('[data-testid="flow-step-when"]').text()).toBe('Otherwise')
		expect(rows(wrapper)[0].find('[data-testid="flow-step-routes"]').text()).toContain('Step 2')
	})

	it('reports an edit and an add to the host', async () => {
		const wrapper = await listOf()

		await rows(wrapper)[1].find('[data-testid="flow-step-edit"]').trigger('click')
		await wrapper.find('[data-testid="flow-step-add"]').trigger('click')

		expect(wrapper.emitted('edit')).toEqual([['m']])
		expect(wrapper.emitted('add')).toHaveLength(1)
	})

	it('deletes through the store, so the canvas loses the step too', async () => {
		const wrapper = await listOf()

		await rows(wrapper)[1].find('[data-testid="flow-step-delete"]').trigger('click')

		expect(wrapper.vm.store.nodes.map((node) => node.id)).not.toContain('m')
		expect(rows(wrapper)).toHaveLength(3)
	})

	it('moves through the store', async () => {
		const flow = {
			lifecycleStatus: 'draft',
			nodes: [{ id: 't', type: 'openregister.trigger-object', start: true }, { id: 'a', type: 'openregister.send-mail', name: 'A' }, { id: 'b', type: 'openregister.send-mail', name: 'B' }],
			edges: [{ from: 't', to: 'a' }, { from: 'a', to: 'b' }],
		}
		const wrapper = await listOf({}, flow)

		await rows(wrapper)[0].find('[data-testid="flow-step-down"]').trigger('click')

		expect(rows(wrapper).map((row) => row.find('strong').text())).toEqual(['B', 'A'])
	})

	it('disables an arrow that cannot move a step and says why', async () => {
		const wrapper = await listOf()
		const down = rows(wrapper)[1].find('[data-testid="flow-step-down"]')

		expect(down.attributes('disabled')).toBeDefined()
		expect(down.attributes('title')).toBe('Steps on a branch are moved on the canvas.')
	})

	it('flags a step nothing leads to', async () => {
		const wrapper = await listOf({}, { ...FLOW, nodes: [...FLOW.nodes, { id: 'z', type: 'openregister.send-mail', name: 'Loose' }] })

		expect(rows(wrapper)[4].find('[data-testid="flow-step-loose"]').exists()).toBe(true)
	})

	it('offers nothing on a published flow', async () => {
		const wrapper = await listOf({}, { ...FLOW, lifecycleStatus: 'published' })

		expect(wrapper.find('[data-testid="flow-step-edit"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="flow-step-add"]').exists()).toBe(false)
		expect(rows(wrapper)).toHaveLength(4)
	})

	it('shows a step\'s outcome in the open run', async () => {
		const wrapper = await listOf({ stepState: (id) => (id === 'c' ? { label: 'Done', variant: 'success' } : null) })

		expect(rows(wrapper)[0].text()).toContain('Done')
		expect(rows(wrapper)[1].text()).not.toContain('Done')
	})

	it('says when the flow has no trigger', async () => {
		const wrapper = await listOf({}, { lifecycleStatus: 'draft', nodes: [], edges: [] })

		expect(wrapper.find('[data-testid="flow-step-no-trigger"]').exists()).toBe(true)
	})
})
