/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/flow-task-form-component/tasks.md#task-4
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const TRIGGER = { id: 't', type: 'openregister.trigger-object', config: { schema: 'permit' } }

function step(fields) {
	return { id: 'ask', type: 'openregister.user-task', config: { form: { fields } } }
}

async function mountEditor(nodes, flow = {}) {
	const wrapper = mount(CnFlowDetail, {
		global: { mocks: { t: (app, s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k]) : s) } },
		shallow: true,
	})
	wrapper.vm.store.load = jest.fn().mockResolvedValue(undefined)
	Object.assign(wrapper.vm.store, { flow: { id: 'f-1', name: 'A flow', nodes, edges: [], ...flow } })
	await new Promise((resolve) => setTimeout(resolve, 0))
	return wrapper
}

function drift(wrapper) {
	return wrapper.vm.canvasMessages.filter((m) => m.id.startsWith('task-form-drift-'))
}

describe('CnFlowDetail flags a user-task form that drifted', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('names the step and the field the schema dropped', async () => {
		axios.get.mockResolvedValue({ data: { properties: { note: {} } } })
		const wrapper = await mountEditor([TRIGGER, step(['note', 'riskScore'])])
		const messages = drift(wrapper)
		expect(messages).toHaveLength(1)
		expect(messages[0].text).toContain('riskScore is no longer in the schema')
		expect(messages[0].text).not.toContain('note ')
		expect(wrapper.vm.formDriftOf(wrapper.vm.store.nodes[1])).toEqual([{ field: 'riskScore', reason: 'absent' }])
	})

	it('clears the flag when the step no longer asks for the field', async () => {
		axios.get.mockResolvedValue({ data: { properties: { note: {} } } })
		const wrapper = await mountEditor([TRIGGER, step(['note', 'riskScore'])])
		expect(drift(wrapper)).toHaveLength(1)
		wrapper.vm.store.flow.nodes[1].config.form.fields = ['note']
		await wrapper.vm.$nextTick()
		expect(drift(wrapper)).toHaveLength(0)
	})

	it('flags nothing when the trigger names no schema', async () => {
		const wrapper = await mountEditor([{ id: 't', type: 'openregister.trigger-manual', config: {} }, step(['riskScore'])])
		expect(drift(wrapper)).toHaveLength(0)
		expect(axios.get.mock.calls.some(([url]) => url.includes('/schemas/'))).toBe(false)
	})

	it('flags nothing when the schema cannot be read', async () => {
		axios.get.mockRejectedValue(new Error('404'))
		const wrapper = await mountEditor([TRIGGER, step(['riskScore'])])
		expect(drift(wrapper)).toHaveLength(0)
	})
})
