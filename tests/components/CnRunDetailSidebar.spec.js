/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Reading a run REPLACES the flow's sidebar rather than nesting inside it.
 *
 * WHAT WAS WRONG WITH NESTING
 * ---------------------------
 * The run rendered as a block inside the Runs tab, with a tab strip of its own.
 * That put TABS INSIDE A TAB: the flow's strip (Steps, Runs) stayed on screen
 * above the run's (Objects, Tasks, Logs) and the two competed for the same
 * glance.
 *
 * The worse half was that the flow's tabs stayed LIVE. Pressing Steps while
 * reading a run swapped the sidebar panel and left the canvas painted with that
 * run's badges — so the graph and the sidebar were describing different things,
 * with nothing on screen saying so.
 *
 * So there is one strip at a time, and the way back is a deliberate act with
 * its own control.
 */

import { mount } from '@vue/test-utils'
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

const RUN = { uuid: 'run-1', status: 'failed', created: '2026-09-06T09:55:23+00:00', error: 'it broke' }

/**
 * Mount the sidebar over the store THE COMPONENT holds.
 *
 * `tests/setup.js` installs a global pinia, so a store made out here is a
 * different instance and every assertion would read "".
 *
 * @param {object} state Store overrides.
 * @return {Promise<object>} The wrapper.
 */
async function mountSidebar(state = {}) {
	const wrapper = mount(CnFlowSidebar, {
		props: { embedded: true },
		global: {
			stubs: {
				NcAppSidebar: { template: '<aside><slot name="description" /><slot /></aside>' },
				NcAppSidebarTab: { template: '<div><slot /></div>', props: ['name'] },
				NcActions: { template: '<div><slot /></div>' },
				NcActionButton: { template: '<button><slot /></button>' },
				NcButton: { template: '<button :data-testid="$attrs[\'data-testid\']"><slot /></button>' },
				NcCheckboxRadioSwitch: true,
				NcSelect: true,
				NcTextField: true,
				CnFlowSettingsModal: true,
				Cog: true,
				History: true,
				Sitemap: true,
				ArrowLeft: true,
				Replay: true,
			},
			mocks: { t: (app, s) => s },
		},
	})

	Object.assign(wrapper.vm.store, {
		flow: { id: 'f-1', name: 'A flow', nodes: [], edges: [] },
		runs: [RUN],
		...state,
	})
	await wrapper.vm.$nextTick()

	return wrapper
}

describe('a run replaces the flow’s sidebar', () => {
	it('shows the flow’s own tabs while no run is open', async () => {
		const wrapper = await mountSidebar()

		expect(wrapper.find('[data-testid="run-detail-sidebar"]').exists()).toBe(false)
		// The sidebar is the flow's RUNS now: the palette moved to a modal and
		// took the Steps tab with it.
		expect(wrapper.text()).toContain('Runs')
	})

	it('replaces them with the run’s own sidebar once a run is open', async () => {
		const wrapper = await mountSidebar({ inspectedRunUuid: 'run-1' })

		expect(wrapper.find('[data-testid="run-detail-sidebar"]').exists()).toBe(true)
	})

	it('leaves NO second tab strip behind: the flow’s tabs are gone, not hidden', async () => {
		const wrapper = await mountSidebar({ inspectedRunUuid: 'run-1' })

		// The defect this split exists for. A hidden-but-live strip let an
		// author press Steps while the canvas kept the run's badges.
		const strips = wrapper.findAll('[role="tablist"]')
		expect(strips).toHaveLength(1)
		expect(strips[0].text()).toContain('Objects')
		expect(strips[0].text()).not.toContain('Steps')
	})

	it('offers the three run tabs, and nothing about the flow', async () => {
		const wrapper = await mountSidebar({ inspectedRunUuid: 'run-1' })

		for (const id of ['objects', 'tasks', 'logs']) {
			expect(wrapper.find(`[data-testid="flow-run-tab-${id}"]`).exists()).toBe(true)
		}
	})

	it('says which run it is, and why it ended badly', async () => {
		const wrapper = await mountSidebar({ inspectedRunUuid: 'run-1' })

		expect(wrapper.find('[data-testid="run-status"]').text()).toBe('failed')
		expect(wrapper.find('[data-testid="run-error"]').text()).toBe('it broke')
	})

	it('carries a way back, because a view that replaced another must undo itself', async () => {
		const wrapper = await mountSidebar({ inspectedRunUuid: 'run-1' })

		const back = wrapper.find('[data-testid="run-back"]')
		expect(back.exists()).toBe(true)

		await back.trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.store.inspectedRunUuid).toBeNull()
		expect(wrapper.find('[data-testid="run-detail-sidebar"]').exists()).toBe(false)
	})
})
