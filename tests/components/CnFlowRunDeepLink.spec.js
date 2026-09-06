/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Opening a run by its own URL.
 *
 * THE LINK HAS TWO HALVES AND ONLY ONE OF THEM IS THE `<a href>`.
 * `/apps/openregister/flow-runs/{uuid}` resolves on the server, reads the run,
 * finds its flow and `router.replace`s to `/flows/{flowId}?run={runUuid}`. The
 * address bar therefore ends up on the FLOW, with the run in the query — by
 * design, so Back does not bounce the visitor forwards again.
 *
 * Which means the editor has to read `?run=` and inspect that run. Without it
 * the link opens the right flow with no run selected, and reads as a broken
 * deep link rather than as a missing wire. `useFlowStore` has had
 * `inspectedRunUuid` and `inspectRun()` all along; nothing connected the query
 * parameter to them.
 *
 * The query is read by the PAGE and passed down as a prop, the same way the
 * flow id already is. CnFlowDetail stays router-agnostic: it is a library
 * component, and a consumer mounting it outside a route must still be able to
 * say which run to open.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'
import CnFlowEditorPage from '../../src/components/CnFlowsPage/CnFlowEditorPage.vue'
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

const CANVAS_STUBS = {
	CnGraphCanvas: {
		name: 'CnGraphCanvas',
		props: ['nodes', 'edges'],
		template: '<div><div v-for="n in nodes" :key="n.id"><slot name="node" :node="n" /></div></div>',
	},
	NcEmptyContent: true,
	Sitemap: true,
}

describe('opening a run by its own URL', () => {
	describe('the editor reads the run out of the query', () => {
		it('inspects the run named by the `run` prop', async () => {
			setActivePinia(createPinia())

			const wrapper = mount(CnFlowDetail, {
				props: { id: 'f1', app: 'openregister', run: 'run-7' },
				global: { stubs: CANVAS_STUBS, mocks: { t: (app, s) => s } },
			})

			const inspect = jest.spyOn(wrapper.vm.store, 'inspectRun').mockResolvedValue(undefined)

			// The load is what the deep link lands after: the flow arrives, and
			// then the run inside it can be selected.
			await wrapper.vm.openRunFromRoute()

			expect(inspect).toHaveBeenCalledWith('run-7')
		})

		it('inspects nothing when the URL named no run', async () => {
			setActivePinia(createPinia())

			const wrapper = mount(CnFlowDetail, {
				props: { id: 'f1', app: 'openregister' },
				global: { stubs: CANVAS_STUBS, mocks: { t: (app, s) => s } },
			})

			const inspect = jest.spyOn(wrapper.vm.store, 'inspectRun').mockResolvedValue(undefined)
			await wrapper.vm.openRunFromRoute()

			expect(inspect).not.toHaveBeenCalled()
		})

		it('follows the query to another run without a remount', async () => {
			setActivePinia(createPinia())

			const wrapper = mount(CnFlowDetail, {
				props: { id: 'f1', app: 'openregister', run: 'run-7' },
				global: { stubs: CANVAS_STUBS, mocks: { t: (app, s) => s } },
			})

			const inspect = jest.spyOn(wrapper.vm.store, 'inspectRun').mockResolvedValue(undefined)

			// Same route record, different query: Vue reuses the instance, so
			// `mounted` does not fire again. The flow-id watcher already exists
			// for exactly this reason.
			await wrapper.setProps({ run: 'run-8' })

			expect(inspect).toHaveBeenCalledWith('run-8')
		})
	})

	describe('the page takes it off the route', () => {
		it('passes `?run=` down to the editor', () => {
			setActivePinia(createPinia())

			const wrapper = mount(CnFlowEditorPage, {
				global: {
					stubs: { CnFlowDetail: { name: 'CnFlowDetail', props: ['id', 'app', 'run'], template: '<div />' } },
					mocks: {
						$route: { params: { id: 'f1' }, query: { run: 'run-7' } },
						$router: { replace: jest.fn() },
						t: (app, s) => s,
					},
				},
			})

			expect(wrapper.findComponent({ name: 'CnFlowDetail' }).props('run')).toBe('run-7')
		})

		it('passes an empty run when the URL carries none', () => {
			setActivePinia(createPinia())

			const wrapper = mount(CnFlowEditorPage, {
				global: {
					stubs: { CnFlowDetail: { name: 'CnFlowDetail', props: ['id', 'app', 'run'], template: '<div />' } },
					mocks: {
						$route: { params: { id: 'f1' }, query: {} },
						$router: { replace: jest.fn() },
						t: (app, s) => s,
					},
				},
			})

			expect(wrapper.findComponent({ name: 'CnFlowDetail' }).props('run')).toBe('')
		})
	})

	describe('the sidebar goes where the run is', () => {
		it('opens the Runs tab when a run is inspected, not only when one starts', async () => {
			setActivePinia(createPinia())

			const wrapper = mount(CnFlowSidebar, {
				global: {
					stubs: {
						NcAppSidebar: { template: '<aside><slot name="description" /><slot name="secondary-actions" /><slot /></aside>' },
						NcAppSidebarTab: { template: '<div><slot /></div>' },
						NcActions: { template: '<div><slot /></div>' },
						NcActionButton: { template: '<button><slot /></button>' },
						NcButton: { template: '<button><slot /></button>' },
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

			expect(wrapper.vm.tab).toBe('flow-steps')

			// A deep-linked run is INSPECTED, not watched: `watchedRunUuid` is
			// for a run the editor started and is polling. Switching on the
			// watch alone would leave a visitor who followed a run's URL
			// looking at the palette.
			wrapper.vm.store.inspectedRunUuid = 'run-7'
			await wrapper.vm.$nextTick()

			expect(wrapper.vm.tab).toBe('flow-runs')
		})
	})
})
