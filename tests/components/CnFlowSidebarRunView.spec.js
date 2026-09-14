/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A run gets its own view: Objects, Tasks and Logs, and its own URL.
 *
 * WHY A REAL HREF AND NOT A CLICK HANDLER
 * ---------------------------------------
 * A run is a thing an author wants open beside the flow while they read it, so
 * middle-click and ctrl-click have to work. `@click="router.push(…)"` on a
 * `<button>` looks identical until someone tries either, and then does nothing
 * with no error. Only an `<a href>` gets that behaviour from the browser, so
 * this file asserts the ELEMENT and the ATTRIBUTE, not that a handler fired.
 *
 * The URL is `/apps/openregister/flow-runs/{uuid}`. openregister's
 * `dashboard#catchAll` already shells multi-segment non-`api/` paths, so it
 * resolves; the vue-router route that renders it is a separate change on that
 * side, and until it lands the link opens an empty shell. That is expected.
 *
 * WHAT EACH TAB IS ANSWERABLE FROM
 * --------------------------------
 * - Objects: `GET /api/flow-runs/{uuid}/objects`, already read into
 *   `store.runObjects`. Audit attribution, grouped by the node that wrote it.
 * - Logs: the run's own `log`, already read into `store.steps`.
 * - Tasks: `GET /api/flow-tasks?runUuid={uuid}`. ⚠️ The `runUuid` filter is
 *   being added to `task#index` on the openregister side and is NOT merged yet.
 *   The tab therefore renders its empty state rather than a stub: a fake list
 *   here would go green and stay green after the real endpoint arrived wrong.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowSidebar from '../../src/components/CnFlowDetail/CnFlowSidebar.vue'

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
 * Mount the sidebar over a store seeded with the given state.
 *
 * @param {object} state Store overrides.
 * @return {object} The wrapper and the store.
 */
async function mountSidebar(state = {}) {
	setActivePinia(createPinia())

	const wrapper = mount(CnFlowSidebar, {
		global: {
			stubs: {
				NcAppSidebar: { template: '<aside class="app-sidebar"><slot name="description" /><slot name="secondary-actions" /><slot /></aside>' },
				NcAppSidebarTab: { template: '<div class="app-sidebar-tab" :data-tab="name"><slot /></div>', props: ['name'] },
				NcActions: { template: '<div class="actions"><slot /></div>' },
				NcActionButton: { template: '<button class="action-button"><slot /></button>' },
				NcButton: { template: '<button :disabled="disabled"><slot /></button>', props: ['disabled'] },
				NcCheckboxRadioSwitch: true,
				NcSelect: true,
				NcTextField: true,
				CnFlowSettingsModal: true,
				Cog: true,
				History: true,
				Sitemap: true,
			},
			mocks: { t: (app, s) => s },
		},
	})

	const store = wrapper.vm.store
	Object.assign(store, state)
	await wrapper.vm.$nextTick()

	return { wrapper, store }
}

const RUNS = [
	{ uuid: 'run-1', status: 'completed', created: '2026-09-06 08:00' },
	{ uuid: 'run-2', status: 'failed', created: '2026-09-06 09:00' },
]

describe('CnFlowSidebar — the run view', () => {
	describe('opening a run in its own tab', () => {
		it('gives every run row a real link to its own URL', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
			})

			const links = wrapper.findAll('[data-testid="flow-run-link"]')
			expect(links).toHaveLength(2)

			// An <a> with an href, so the browser gives middle-click and
			// ctrl-click for free. A <button> with a click handler cannot.
			expect(links[0].element.tagName).toBe('A')
			expect(links[0].attributes('href')).toBe('/apps/openregister/flow-runs/run-1')
			expect(links[1].attributes('href')).toBe('/apps/openregister/flow-runs/run-2')
		})

		it('still inspects the run in place on a plain click', async () => {
			const { wrapper, store } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
			})

			const inspect = jest.spyOn(store, 'inspectRun').mockResolvedValue(undefined)
			await wrapper.findAll('[data-testid="flow-run-link"]')[0].trigger('click')

			// The link is the way OUT to a tab of its own; a plain click keeps
			// the author where they are. Both, or the href costs a feature.
			expect(inspect).toHaveBeenCalledWith('run-1')
		})

		it('lets a modified click through to the browser', async () => {
			const { wrapper, store } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
			})

			const inspect = jest.spyOn(store, 'inspectRun').mockResolvedValue(undefined)
			await wrapper.findAll('[data-testid="flow-run-link"]')[0].trigger('click', { ctrlKey: true })

			// Handling a ctrl-click in place would open the run in this panel
			// AND in a new tab, which is not what either gesture asked for.
			expect(inspect).not.toHaveBeenCalled()
		})
	})

	describe('the run view tabs', () => {
		// ⚠️ THESE ARE THE SIDEBAR'S TABS, NOT A STRIP OF OUR OWN.
		//
		// They used to be three hand-rolled buttons with a border under the
		// active one, sitting inside NcAppSidebar. They read as a panel dropped
		// into the sidebar rather than as the sidebar's tabs: no icons, the
		// wrong size, the wrong active mark, and none of NcAppSidebarTabs'
		// keyboard behaviour. So the assertion is that each panel registers
		// with the sidebar as an NcAppSidebarTab, by name.
		it('registers Objects, Tasks and Logs as the sidebar’s own tabs', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
				inspectedRunUuid: 'run-1',
			})

			const names = wrapper.findAll('.app-sidebar-tab').map((el) => el.attributes('data-tab'))
			expect(names).toEqual(['Objects', 'Tasks', 'Logs'])

			// And nothing hand-rolled beside them. A second strip is how the
			// old defect would come back without any test noticing.
			expect(wrapper.findAll('[role="tablist"]')).toHaveLength(0)
		})

		/**
		 * ⚠️ THE LOADING WINDOW, WHICH IS WHERE THIS WAS WRONG. A visitor
		 * following `?run=` reached the flow before the run had been read, and
		 * the sidebar read `inspectedRunUuid`, which is only set once the fetch
		 * returns. So it showed the flow's Runs tab for the length of the load,
		 * telling the reader to "save the flow first" on a flow that had run
		 * many times, while the canvas beside it was already in run view.
		 */
		it('is in run view while the run named by the URL is still being read', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
				// What the URL said, before anything came back.
				openingRunUuid: 'run-1',
				inspectedRunUuid: null,
			})

			expect(wrapper.find('[data-testid="run-detail-sidebar"]').exists()).toBe(true)
			expect(wrapper.text()).not.toContain('Save the flow first')
		})

		it('shows no run tabs while no run is being inspected', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
			})

			const names = wrapper.findAll('.app-sidebar-tab').map((el) => el.attributes('data-tab'))
			expect(names).toEqual(['Runs'])
		})

		it('lists what the run touched under Objects, with the node that did it', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
				inspectedRunUuid: 'run-1',
				steps: [{ transition: 'a', status: 'completed' }],
				runObjects: [
					{ node: 'a', objects: [{ auditUuid: 'au-1', action: 'create', objectUuid: 'obj-1' }] },
				],
			})

			const objects = wrapper.find('[data-testid="flow-run-panel-objects"]')
			expect(objects.text()).toContain('obj-1')
			expect(objects.text()).toContain('create')
		})

		it('marks an object no step in the log accounts for', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
				inspectedRunUuid: 'run-1',
				steps: [{ transition: 'a', status: 'completed' }],
				runObjects: [
					{ node: 'ghost', objects: [{ auditUuid: 'au-2', action: 'update', objectUuid: 'obj-2' }] },
				],
			})

			// The run changed something its own step history cannot explain.
			// Hiding that would be the opposite of what this view is for.
			expect(wrapper.find('[data-testid="flow-object-unaccounted"]').exists()).toBe(true)
		})

		it('puts the step history under Logs', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
				inspectedRunUuid: 'run-1',
				steps: [{ transition: 'send-letter', status: 'completed' }],
			})

			expect(wrapper.find('[data-testid="flow-run-panel-logs"]').text()).toContain('send-letter')
		})

		it('renders an empty Tasks tab rather than inventing rows', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
				inspectedRunUuid: 'run-1',
				runTasks: [],
			})

			expect(wrapper.find('[data-testid="flow-run-tasks-empty"]').exists()).toBe(true)
		})

		it('lists the run\'s tasks once the endpoint answers with some', async () => {
			const { wrapper } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
				runs: RUNS,
				inspectedRunUuid: 'run-1',
				runTasks: [
					{ uuid: 't-1', title: 'Approve the mandate', state: 'open' },
				],
			})

			expect(wrapper.find('[data-testid="flow-run-panel-tasks"]').text()).toContain('Approve the mandate')
			// A task has its own stable address too, the one the notification
			// buttons and the VTODO already resolve to.
			expect(wrapper.find('[data-testid="flow-task-link"]').attributes('href'))
				.toBe('/apps/openregister/flow-tasks/t-1')
		})
	})

	describe('starting a run puts the author where the run is', () => {
		// ⚠️ INVERTED. These used to assert that starting a run SWITCHED the
		// sidebar from Steps to Runs, because being left on the palette while a
		// run started is how an author concludes nothing happened.
		//
		// There is no longer anywhere else to be. The palette moved to a modal
		// and took the Steps tab with it, so the sidebar is the flow's runs
		// whether or not one has started. The guarantee the old tests bought is
		// now structural, and this is what remains of it: it must not be
		// possible to be looking at something else when a run begins.
		it('is already showing runs when a run begins, with nowhere else to be', async () => {
			const { wrapper, store } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
			})
			expect(wrapper.vm.tab).toBe('flow-runs')

			store.watchedRunUuid = 'run-9'
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.tab).toBe('flow-runs')
		})

		it('stays there when no run started', async () => {
			const { wrapper, store } = await mountSidebar({
				flow: { id: 'f1', name: 'x', nodes: [], edges: [] },
			})

			store.watchedRunUuid = null
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.tab).toBe('flow-runs')
		})
	})
})
