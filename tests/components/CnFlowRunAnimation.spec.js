/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The run animator in CnFlowDetail: the FlowMock promise, on the real canvas,
 * from the real log.
 *
 * The engine persists the log ONCE per worker pass, so steps arrive in
 * bursts. The animator queues them and plays them strictly in log order at a
 * bounded catch-up pace — never fabricated per-step timing. A step whose
 * `transition` matches no canvas node is skipped and SAID, never remapped.
 * Under reduced motion the states paint statically, with no sequential
 * reveal at all.
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

/**
 * Mount the canvas over a three-node chain a → b → c.
 *
 * @return {Promise<{wrapper: object, store: object}>} The wrapper and store.
 */
async function mountChain() {
	setActivePinia(createPinia())

	const wrapper = mount(CnFlowDetail, {
		global: {
			stubs: {
				CnGraphCanvas: {
					name: 'CnGraphCanvas',
					props: ['nodes', 'edges'],
					template: '<div><div v-for="n in nodes" :key="n.id"><slot name="node" :node="n" /></div></div>',
				},
				NcEmptyContent: true,
				Sitemap: true,
			},
			mocks: {
				// Substitutes placeholders the way @nextcloud/l10n does, so
				// the skipped-steps card can be asserted on its content.
				t: (app, s, vars = {}) => String(s).replace(
					/\{(\w+)\}/g,
					(match, key) => (vars[key] !== undefined ? String(vars[key]) : match),
				),
			},
		},
	})

	const store = wrapper.vm.store
	Object.assign(store, {
		flow: {
			...store.flow,
			id: 'flow-1',
			nodes: [
				{ id: 'a', type: 'openregister.trigger-manual', config: {}, start: true },
				{ id: 'b', type: 'openregister.set-fields', config: {} },
				{ id: 'c', type: 'openregister.end', config: {} },
			],
			edges: [
				{ from: 'a', to: 'b' },
				{ from: 'b', to: 'c' },
			],
		},
	})
	await wrapper.vm.$nextTick()

	return { wrapper, store }
}

/**
 * Start a live watch on the mounted canvas without touching the network.
 *
 * @param {object} store The component's store.
 * @param {object} wrapper The mounted wrapper.
 * @return {Promise<void>}
 */
async function beginWatch(store, wrapper) {
	store.watchedRunUuid = 'run-1'
	store.watchedRun = { uuid: 'run-1', status: 'running', log: [] }
	await wrapper.vm.$nextTick()
}

describe('CnFlowDetail run animation', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('plays a burst as ordered hops at the catch-up pace, not as one repaint', async () => {
		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		// One poll delivered every step of the pass at once.
		store.watchedSteps = [
			{ transition: 'a', status: 'completed' },
			{ transition: 'b', status: 'completed' },
			{ transition: 'c', status: 'completed' },
		]
		await wrapper.vm.$nextTick()

		// The first hop is live immediately; the rest still queue.
		expect(wrapper.vm.runAnimation.currentNodeId).toBe('a')
		expect(wrapper.vm.runAnimation.doneNodeIds).toEqual(['a'])

		await jest.advanceTimersByTimeAsync(320)
		expect(wrapper.vm.runAnimation.currentNodeId).toBe('b')
		// The hop b arrived on traces the a → b line.
		expect(wrapper.vm.runAnimation.traceLineId).toContain('a:b')

		await jest.advanceTimersByTimeAsync(320)
		expect(wrapper.vm.runAnimation.currentNodeId).toBe('c')

		// Strictly log order, and the whole burst caught up within a second.
		expect(wrapper.vm.runAnimation.doneNodeIds).toEqual(['a', 'b', 'c'])

		wrapper.unmount()
	})

	it('paints the run-state classes and their labels onto the node bodies', async () => {
		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		store.watchedSteps = [
			{ transition: 'a', status: 'completed' },
			{ transition: 'b', status: 'failed', error: 'boom' },
		]
		await wrapper.vm.$nextTick()
		await jest.advanceTimersByTimeAsync(1000)
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.cn-flow-detail__node--run-done').exists()).toBe(true)
		expect(wrapper.find('.cn-flow-detail__node--run-failed').exists()).toBe(true)
		// Never colour alone: the state is also said in words (WCAG 1.4.1).
		expect(wrapper.text()).toContain('Done')
		expect(wrapper.text()).toContain('Failed')

		wrapper.unmount()
	})

	it('skips a step whose node is gone, says so, and continues on real nodes', async () => {
		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		store.watchedSteps = [
			{ transition: 'a', status: 'completed' },
			{ transition: 'ghost', status: 'completed' },
			{ transition: 'c', status: 'completed' },
		]
		await wrapper.vm.$nextTick()
		await jest.advanceTimersByTimeAsync(1000)
		await wrapper.vm.$nextTick()

		// The ghost never lands on a card, and never on the WRONG card…
		expect(wrapper.vm.runAnimation.doneNodeIds).toEqual(['a', 'c'])
		// …and the mismatch is stated rather than swallowed.
		expect(wrapper.vm.skippedRunTransitions).toEqual(['ghost'])
		expect(wrapper.find('.cn-flow-detail__run-skipped').text()).toContain('ghost')

		wrapper.unmount()
	})

	it('pulses the start node while the run reports running with an empty log', async () => {
		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		// A mid-pass poll: status running, log still empty. Pretending a
		// specific step is executing would fabricate liveness; the start
		// node's anticipation pulse is the honest rendering.
		expect(wrapper.vm.runNodeStates).toEqual({ a: 'active' })

		wrapper.unmount()
	})

	it('shows the hold state on a suspended step until the run moves on', async () => {
		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		store.watchedRun = { uuid: 'run-1', status: 'suspended', log: [] }
		store.watchedSteps = [
			{ transition: 'a', status: 'completed' },
			{ transition: 'b', status: 'suspended', reason: 'signal' },
		]
		await wrapper.vm.$nextTick()
		await jest.advanceTimersByTimeAsync(1000)
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.runNodeStates.b).toBe('hold')
		expect(wrapper.find('.cn-flow-detail__node--run-hold').exists()).toBe(true)
		expect(wrapper.text()).toContain('Waiting')

		wrapper.unmount()
	})

	it('appends a resumed pass without replaying the animated steps', async () => {
		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		store.watchedSteps = [
			{ transition: 'a', status: 'completed' },
			{ transition: 'b', status: 'suspended' },
		]
		await wrapper.vm.$nextTick()
		await jest.advanceTimersByTimeAsync(1000)
		expect(wrapper.vm.runAnimation.playedCount).toBe(2)

		// The resumed pass appends after the suspended entry.
		store.watchedSteps = [
			...store.watchedSteps,
			{ transition: 'b', status: 'completed' },
			{ transition: 'c', status: 'completed' },
		]
		await wrapper.vm.$nextTick()
		await jest.advanceTimersByTimeAsync(1000)

		// Four hops in total — the first two never played again.
		expect(wrapper.vm.runAnimation.playedCount).toBe(4)
		expect(wrapper.vm.runAnimation.doneNodeIds).toEqual(['a', 'b', 'c'])

		wrapper.unmount()
	})

	it('drains instantly into static colouring under reduced motion', async () => {
		window.matchMedia = jest.fn(() => ({ matches: true }))

		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		store.watchedSteps = [
			{ transition: 'a', status: 'completed' },
			{ transition: 'b', status: 'completed' },
			{ transition: 'c', status: 'completed' },
		]
		await wrapper.vm.$nextTick()

		// No timers advanced: everything already painted, nothing mid-hop.
		expect(wrapper.vm.runAnimation.doneNodeIds).toEqual(['a', 'b', 'c'])
		expect(wrapper.vm.runAnimation.timer).toBeNull()
		expect(wrapper.vm.runAnimation.queue).toHaveLength(0)

		wrapper.unmount()
		delete window.matchMedia
	})

	it('replays the inspected log with per-hop timing clamped from real durations', async () => {
		const { wrapper, store } = await mountChain()

		store.steps = [
			{ transition: 'a', status: 'completed', durationMs: 5 },
			{ transition: 'b', status: 'completed', durationMs: 900 },
			{ transition: 'c', status: 'completed', durationMs: 999999 },
		]
		store.replayToken += 1
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.runAnimation.mode).toBe('replay')
		expect(wrapper.vm.runAnimation.currentNodeId).toBe('a')

		// 5ms clamps UP to the 200ms floor: a sub-perceptual step stays visible.
		await jest.advanceTimersByTimeAsync(199)
		expect(wrapper.vm.runAnimation.currentNodeId).toBe('a')
		await jest.advanceTimersByTimeAsync(1)
		expect(wrapper.vm.runAnimation.currentNodeId).toBe('b')

		// 900ms is real data inside the window: used as it is.
		await jest.advanceTimersByTimeAsync(899)
		expect(wrapper.vm.runAnimation.currentNodeId).toBe('b')
		await jest.advanceTimersByTimeAsync(1)
		expect(wrapper.vm.runAnimation.currentNodeId).toBe('c')

		// 999999ms clamps DOWN to 1500ms: a long wait does not stall the replay.
		await jest.advanceTimersByTimeAsync(1500)
		expect(wrapper.vm.runAnimation.currentNodeId).toBeNull()
		expect(wrapper.vm.runAnimation.doneNodeIds).toEqual(['a', 'b', 'c'])

		wrapper.unmount()
	})

	it('tears the run picture down on a graph edit', async () => {
		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		store.watchedSteps = [{ transition: 'a', status: 'completed' }]
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.runAnimation.mode).toBe('watch')

		// The log names the graph AS IT RAN; an edited graph must not wear it.
		store.dirty = true
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.runAnimation.mode).toBeNull()
		expect(wrapper.vm.runAnimation.doneNodeIds).toEqual([])
		expect(wrapper.vm.runNodeStates).toEqual({})

		wrapper.unmount()
	})

	it('marks the traced lines on the edges it hands the canvas', async () => {
		const { wrapper, store } = await mountChain()
		await beginWatch(store, wrapper)

		store.watchedSteps = [
			{ transition: 'a', status: 'completed' },
			{ transition: 'b', status: 'completed' },
		]
		await wrapper.vm.$nextTick()
		await jest.advanceTimersByTimeAsync(320)
		await wrapper.vm.$nextTick()

		// Mid-hop: the a → b line is the one being traced.
		const tracing = wrapper.vm.canvasEdgesWithRunState
			.find((line) => line.class === 'cn-flow-detail__edge--run-tracing')
		expect(tracing).toBeDefined()
		expect(tracing.source).toBe('a')
		expect(tracing.target).toBe('b')

		await jest.advanceTimersByTimeAsync(320)
		await wrapper.vm.$nextTick()

		// After the hop it keeps the quiet success stroke instead.
		const traced = wrapper.vm.canvasEdgesWithRunState
			.find((line) => line.class === 'cn-flow-detail__edge--run-traced')
		expect(traced).toBeDefined()
		expect(traced.source).toBe('a')
		expect(traced.target).toBe('b')

		wrapper.unmount()
	})
})
