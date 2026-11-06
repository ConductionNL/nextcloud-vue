/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const NODES = [
	{ id: 'check', type: 'switch' },
	{ id: 'mail', type: 'mail' },
	{ id: 'write', type: 'write' },
]
const EDGES = [{ id: 'e1', from: 'check', to: 'mail' }, { id: 'e2', from: 'check', to: 'write' }]
const LOG = [
	{ transition: 'check', status: 'completed' },
	{ transition: 'write', status: 'failed', error: 'No operation' },
]
const RUN = { uuid: 'r1', status: 'failed', log: LOG }

/**
 * @return {object} The editor with a finished run open.
 */
async function openRun() {
	setActivePinia(createPinia())
	const { vm } = mount(CnFlowDetail, {
		global: { stubs: { CnGraphCanvas: true, NcEmptyContent: true, Sitemap: true }, mocks: { t: (app, s) => s } },
	})
	Object.assign(vm.store, {
		flow: { id: 'f1', nodes: NODES, edges: EDGES },
		inspectedRunUuid: 'r1',
		runDetail: RUN,
		steps: LOG,
	})
	await vm.$nextTick()

	return vm
}

describe('CnFlowDetail with a run open', () => {
	it('shows each step as it ended without a replay', async () => {
		const vm = await openRun()

		expect(vm.runAnimation.mode).toBeNull()
		expect(vm.runStateOf('check')).toBe('done')
		expect(vm.runStateOf('write')).toBe('failed')
		expect(vm.runStateOf('mail')).toBe('skipped')
		expect(vm.runStateLabel('skipped')).toBe('Not run')
		expect(vm.runLinesOf('write')).toBe(1)
	})

	it('draws the route the run took and steps back from the other', async () => {
		const vm = await openRun()
		const classes = Object.fromEntries(vm.canvasEdgesWithRunState.map((line) => [line.target, line.class]))

		expect(classes).toEqual({ write: 'cn-flow-detail__edge--run-taken', mail: 'cn-flow-detail__edge--run-not-taken' })
	})

	it('leaves the picture to the replay while it plays, and takes it back at the end', async () => {
		jest.useFakeTimers()
		const vm = await openRun()

		vm.store.requestReplay()
		await vm.$nextTick()
		expect(vm.runSettled).toBe(false)
		expect(vm.runStateOf('mail')).toBeNull()

		jest.runAllTimers()
		await vm.$nextTick()
		jest.useRealTimers()
		expect(vm.runSettled).toBe(true)
		expect(vm.runStateOf('mail')).toBe('skipped')
	})

	it('draws no picture over unsaved changes', async () => {
		const vm = await openRun()

		vm.store.dirty = true
		await vm.$nextTick()

		expect(vm.runStateOf('write')).toBeNull()
		expect(vm.canvasEdgesWithRunState.every((line) => !line.class)).toBe(true)
	})

	it('draws nothing outside a run', async () => {
		const vm = await openRun()

		vm.store.inspectedRunUuid = null
		await vm.$nextTick()

		expect(vm.runStateOf('check')).toBeNull()
	})
})
