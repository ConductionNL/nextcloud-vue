/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Arriving on a flow with a run in the URL.
 *
 * TWO DEFECTS, ONE WINDOW. Opening `/flows/{id}?run={uuid}` rendered the full
 * flow EDITOR for as long as the load took, and the canvas said the flow had
 * no steps while it was still fetching them:
 *
 *   1. The page started in flow-edit mode and only became a run view once both
 *      the flow and the run had arrived. The address bar had already said a run
 *      was being viewed, so Add a step, Save, Run and Check were offered on a
 *      page that was about to be read-only. Save is the dangerous one: `save()`
 *      picks PUT from `flow.id`, and the graph underneath was about to be
 *      replaced by a historic snapshot.
 *   2. Through the same window the canvas rendered "No steps yet", which is
 *      what a flow with no steps looks like. An empty state that means "still
 *      loading" is indistinguishable from a real answer, so nobody waits for it
 *      and nobody reloads.
 *
 * WHY EVERY ASSERTION BELOW IS TAKEN WITH REQUESTS STILL IN THE AIR. The
 * settled state was always correct, so a spec that awaited the load would have
 * passed before the fix and proved nothing. The axios mock therefore returns a
 * promise that never resolves for the loading tests: that IS the window, held
 * open, and the first paint is what is being read.
 */

import { mount } from '@vue/test-utils'
import axios from '@nextcloud/axios'
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

const FLOW_ID = 'flow-77'
const RUN_UUID = 'run-77'
const RUN_VERSION = 1

/** Only on the version the run executed, so "the run opened" has a witness. */
const SINCE_DELETED = 'Deleted since the run'

/**
 * NcEmptyContent is rendered rather than stubbed to `true`, and that matters.
 *
 * Its heading and its line are PROPS, not slot content. A `true` stub keeps
 * them as attributes on a `<nc-empty-content-stub>` element, so `wrapper.text()`
 * never contains "No steps yet" and an assertion that the phrase is absent
 * passes on a canvas that is shouting it. This stub puts both on screen, which
 * is what the assertions here are about.
 */
const CANVAS_STUBS = {
	CnGraphCanvas: {
		name: 'CnGraphCanvas',
		props: ['nodes', 'edges'],
		template: '<div><div v-for="n in nodes" :key="n.id"><slot name="node" :node="n" /></div></div>',
	},
	NcEmptyContent: {
		name: 'NcEmptyContent',
		props: ['name', 'description'],
		template: '<div class="empty"><p>{{ name }}</p><p>{{ description }}</p><slot name="icon" /></div>',
	},
	NcLoadingIcon: true,
	Sitemap: true,
}

/**
 * Every read this arrival makes, keyed by the exact URL.
 *
 * Exact keys rather than patterns: `/flow-runs/{uuid}` and
 * `/flow-runs/{uuid}/objects` are one prefix apart, and a pattern that matched
 * both would answer the run's own record with an empty list. The run record is
 * where `flowVersion` comes from, so that mistake presents as the version
 * graph never loading, a long way from its cause.
 *
 * @return {object} URL to response body.
 */
function answers() {
	return {
		'/apps/openregister/api/flows': {
			results: [{
				id: FLOW_ID,
				uuid: FLOW_ID,
				app: 'openregister',
				name: 'Mandaatbesluit, verkorte route',
				version: 3,
				lifecycleStatus: 'draft',
				nodes: [{ id: 'start', type: 'openregister.trigger-manual', position: { x: 40, y: 60 }, name: 'Manual start' }],
				edges: [],
			}],
		},
		'/apps/openregister/api/flow/node-catalog': { results: [] },
		'/apps/openregister/api/flow/event-catalog': { results: [] },
		'/apps/openregister/api/flow-runs': { results: [] },
		[`/apps/openregister/api/flow-runs/${RUN_UUID}`]: {
			uuid: RUN_UUID,
			flowId: FLOW_ID,
			flowVersion: RUN_VERSION,
			status: 'completed',
			log: [{ transition: 'start', status: 'completed' }],
		},
		[`/apps/openregister/api/flows/${FLOW_ID}/versions/${RUN_VERSION}`]: {
			version: RUN_VERSION,
			graph: {
				nodes: [
					{ id: 'start', type: 'openregister.trigger-manual', position: { x: 40, y: 60 }, name: 'Manual start' },
					{ id: 'since-deleted', type: 'openregister.action-mail', position: { x: 260, y: 60 }, name: SINCE_DELETED },
				],
				edges: [{ id: 'e-v1', source: 'start', target: 'since-deleted' }],
			},
		},
		[`/apps/openregister/api/flow-runs/${RUN_UUID}/objects`]: { results: [], total: 0 },
		'/apps/openregister/api/flow-tasks': { results: [], total: 0 },
	}
}

/**
 * Hold every request open. The load window, as long as a test needs it.
 *
 * @return {void}
 */
function answerNothing() {
	axios.get.mockImplementation(() => new Promise(() => {}))
}

/**
 * Answer every request from the table above.
 *
 * @return {void}
 */
function answerEverything() {
	const table = answers()
	axios.get.mockImplementation((url) => Promise.resolve({ data: table[url] ?? { results: [] } }))
}

/**
 * Let every pending promise settle, including the chain `mounted` awaits.
 *
 * @return {Promise<void>}
 */
async function settle() {
	for (let i = 0; i < 10; i++) {
		await Promise.resolve()
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

/**
 * Mount the canvas the way a route does.
 *
 * @param {object} props The route's props: the flow id, and the run if any.
 * @return {object} The wrapper.
 */
function mountDetail(props = {}) {
	return mount(CnFlowDetail, {
		props: { id: FLOW_ID, app: 'openregister', ...props },
		global: { stubs: CANVAS_STUBS, mocks: { t: (app, s, vars) => (vars ? String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) } },
	})
}

describe('arriving on a flow that has not loaded yet', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	/**
	 * ⚠️ THE ONE THAT MATTERS FOR DEFECT 2. Asserted with the flow request
	 * still open, because that is the only moment the claim was ever made.
	 */
	it('does not claim the flow has no steps while it is still fetching them', async () => {
		answerNothing()

		const wrapper = mountDetail()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="flow-canvas-empty"]').exists()).toBe(false)
		expect(wrapper.text()).not.toContain('No steps yet')
	})

	it('says the flow is loading instead', async () => {
		answerNothing()

		const wrapper = mountDetail()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="flow-canvas-loading"]').exists()).toBe(true)
		expect(wrapper.text()).toContain('Loading the flow')
	})

	/**
	 * The empty state is not being deleted, it is being made true. A flow that
	 * really has no steps must still say so, or this fix would replace one
	 * unreadable canvas with another.
	 */
	it('says there are no steps once the load has finished and there are none', async () => {
		const table = answers()
		table['/apps/openregister/api/flows'] = {
			results: [{ id: FLOW_ID, uuid: FLOW_ID, app: 'openregister', name: 'Empty flow', lifecycleStatus: 'draft', nodes: [], edges: [] }],
		}
		axios.get.mockImplementation((url) => Promise.resolve({ data: table[url] ?? { results: [] } }))

		const wrapper = mountDetail()
		await settle()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.store.canvasLoading).toBe(false)
		expect(wrapper.find('[data-testid="flow-canvas-loading"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="flow-canvas-empty"]').exists()).toBe(true)
		expect(wrapper.text()).toContain('No steps yet')
	})

	/**
	 * A canvas stuck on "loading" forever is a worse lie than the empty state
	 * this replaced, so the flag comes down even when the read fails.
	 */
	it('stops saying it is loading when the flow could not be read', async () => {
		axios.get.mockImplementation(() => Promise.reject(new Error('network is down')))

		const wrapper = mountDetail()
		await settle()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.store.canvasLoading).toBe(false)
		expect(wrapper.find('[data-testid="flow-canvas-loading"]').exists()).toBe(false)
	})
})

describe('arriving with a run in the URL', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	/**
	 * ⚠️ THE ONE THAT MATTERS FOR DEFECT 1. `inspectedRunUuid` is deliberately
	 * asserted to be null here: it is what the OLD code waited for, and it
	 * cannot be set yet because `inspectRun()` runs behind the flow load. Run
	 * view therefore has to come from somewhere earlier, which is the fix.
	 */
	it('is in run view before anything has been fetched', async () => {
		answerNothing()

		const wrapper = mountDetail({ run: RUN_UUID })
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.store.inspectedRunUuid).toBe(null)
		expect(wrapper.vm.store.inRunView).toBe(true)
	})

	it('does not offer the editing controls on the first paint', async () => {
		answerNothing()

		const wrapper = mountDetail({ run: RUN_UUID })
		await wrapper.vm.$nextTick()

		// Each one named, rather than counting buttons: the count would stay
		// right if Save were swapped for something equally wrong.
		expect(wrapper.find('[data-testid="flow-add-step"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="flow-save-button"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="flow-run-button"]').exists()).toBe(false)
		expect(wrapper.text()).not.toContain('Check')
		expect(wrapper.text()).not.toContain('Add a step')
	})

	it('says a run is being opened, rather than that the flow has no steps', async () => {
		answerNothing()

		const wrapper = mountDetail({ run: RUN_UUID })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="flow-toolbar-opening-run"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="flow-canvas-empty"]').exists()).toBe(false)
		expect(wrapper.text()).not.toContain('No steps yet')
		expect(wrapper.text()).toContain('Opening the run')
	})

	/**
	 * The toolbar reading "Flow editor" is the only name the strip has, and a
	 * screen reader that hears it on a run has been told the wrong thing.
	 */
	it('does not call itself the flow editor while a run is opening', async () => {
		answerNothing()

		const wrapper = mountDetail({ run: RUN_UUID })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[role="toolbar"]').attributes('aria-label')).toBe('Flow run')
	})

	/**
	 * NOT A REGRESSION TEST OF THE FIX, A REGRESSION TEST OF WHAT WAS ALREADY
	 * RIGHT. The settled state is unchanged: the version graph is on the canvas,
	 * the canvas names the version, and the editor's controls are back with
	 * Save refused by the snapshot lock rather than hidden.
	 */
	it('fills the run view in, and leaves the settled state as it was', async () => {
		answerEverything()

		const wrapper = mountDetail({ run: RUN_UUID })
		await settle()
		await wrapper.vm.$nextTick()

		const store = wrapper.vm.store
		expect(store.inspectedRunUuid).toBe(RUN_UUID)
		expect(store.openingRunUuid).toBe(null)
		expect(store.viewingVersion).toBe(RUN_VERSION)
		expect(store.canvasLoading).toBe(false)

		// The step that only exists on the version this run executed.
		expect(wrapper.text()).toContain(SINCE_DELETED)
		expect(wrapper.find('[data-testid="flow-canvas-loading"]').exists()).toBe(false)

		// The toolbar is back, and Save is refused by the lock, which is how a
		// snapshot was already protected.
		expect(wrapper.find('[data-testid="flow-add-step"]').exists()).toBe(true)
		expect(store.graphLocked).toBe(true)
	})
})

describe('leaving run view', () => {
	beforeEach(() => {
		axios.get.mockReset()
		answerNothing()
	})

	/**
	 * The run being opened is the second half of run view, so closing the run
	 * has to clear it too. Without this, Back to the flow would leave every
	 * surface in run view with the canvas still saying the run was opening.
	 */
	it('is no longer in run view after the run is closed', async () => {
		const wrapper = mountDetail({ run: RUN_UUID })
		await wrapper.vm.$nextTick()

		const store = wrapper.vm.store
		expect(store.inRunView).toBe(true)

		store.closeRun()
		await wrapper.vm.$nextTick()

		expect(store.inRunView).toBe(false)
		expect(store.openingRunUuid).toBe(null)
	})
})
