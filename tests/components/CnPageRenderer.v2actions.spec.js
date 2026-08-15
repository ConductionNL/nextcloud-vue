/**
 * Integration test: CnPageRenderer v2 path wires cnDispatchAction via provide.
 *
 * Covers REQ-MVR-012 (manifest-v2-renderer) task 12.4:
 * - Mounting CnPageRenderer in v2 mode provides cnDispatchAction
 * - Dispatching an open-modal action reaches cnOpenModal inject
 */

import { shallowMount } from '@vue/test-utils'
// Vue 3 has no default export — `nextTick` is a named import.
import { nextTick as vueNextTick } from 'vue'

const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const v2Manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [
		{
			id: 'home',
			route: '/',
			type: 'index',
			title: 'Home',
			widgets: [],
		},
	],
}

describe('CnPageRenderer v2 — cnDispatchAction provide', () => {
	it('provides cnDispatchAction function to children', () => {
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest: v2Manifest },
			mocks: { $route: { name: 'home', params: {} } },
		})
		// The provided function should exist
		expect(typeof wrapper.vm.$.provides.cnDispatchAction).toBe('function')
	})

	it('cnDispatchAction routes open-modal to cnOpenModal inject', () => {
		const openModal = jest.fn()
		const registry = {
			'my-modal': { kind: 'modal', component: { template: '<div />' }, propsSchema: null },
		}
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest: v2Manifest },
			mocks: { $route: { name: 'home', params: {} } },
			provide: { cnOpenModal: openModal, cnRegistry: registry },
		})
		const dispatch = wrapper.vm.$.provides.cnDispatchAction
		dispatch({ type: 'open-modal', target: 'my-modal', props: { title: 'Hello' } })
		expect(openModal).toHaveBeenCalledWith('my-modal', { title: 'Hello' })
	})

	it('cnDispatchAction routes navigate to $router.push', () => {
		const push = jest.fn()
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest: v2Manifest },
			mocks: { $route: { name: 'home', params: {} }, $router: { push } },
		})
		const dispatch = wrapper.vm.$.provides.cnDispatchAction
		dispatch({ type: 'navigate', target: '/custom/path' })
		expect(push).toHaveBeenCalledWith('/custom/path')
	})
})

describe('CnPageRenderer v2 — export launcher (Wave 1)', () => {
	const exportAction = {
		id: 'report-export',
		label: 'Export report',
		type: 'export',
		description: 'Funder report',
		entities: [{ id: 'leads', label: 'Leads' }, { id: 'requests', label: 'Requests' }],
		formats: ['excel', 'csv', 'json'],
		handler: 'exportReport',
	}

	/**
	 * Mount with a manifest carrying an actions map (handler registry).
	 *
	 * @param {object} [actions] The manifest actions map.
	 * @return {import('@vue/test-utils').Wrapper} The mounted wrapper.
	 */
	function mountRenderer(actions = {}) {
		return shallowMount(CnPageRenderer, {
			propsData: { manifest: { ...v2Manifest, actions } },
			mocks: { $route: { name: 'home', params: {} } },
		})
	}

	it('a type:"export" dispatch opens CnMassExportDialog configured from the action', async () => {
		const wrapper = mountRenderer()
		expect(wrapper.findComponent({ name: 'CnMassExportDialog' }).exists()).toBe(false)
		wrapper.vm.$.provides.cnDispatchAction(exportAction)
		await vueNextTick()
		const dialog = wrapper.findComponent({ name: 'CnMassExportDialog' })
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('entities')).toEqual(exportAction.entities)
		expect(dialog.props('formats')).toEqual([
			{ id: 'excel', label: 'EXCEL' },
			{ id: 'csv', label: 'CSV' },
			{ id: 'json', label: 'JSON' },
		])
		expect(dialog.props('description')).toBe('Funder report')
	})

	it('falls back to the dialog default formats when the action declares none', async () => {
		const wrapper = mountRenderer()
		wrapper.vm.$.provides.cnDispatchAction({ ...exportAction, formats: undefined })
		await vueNextTick()
		const dialog = wrapper.findComponent({ name: 'CnMassExportDialog' })
		// undefined → CnMassExportDialog's own Excel/CSV defaults apply.
		expect(dialog.props('formats').map((f) => f.id)).toEqual(['excel', 'csv'])
	})

	it('confirm routes to the manifest actions handler and reports success', async () => {
		const exportReport = jest.fn().mockResolvedValue()
		const wrapper = mountRenderer({ exportReport })
		wrapper.vm.$.provides.cnDispatchAction(exportAction)
		await vueNextTick()
		await wrapper.vm.onExportConfirm({ format: 'csv', entity: 'leads' })
		expect(exportReport).toHaveBeenCalledWith({ format: 'csv', entity: 'leads' }, exportAction)
	})

	it('a missing handler warns and reports a dialog error (never silent success)', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const setResult = jest.fn()
		const wrapper = mountRenderer()
		wrapper.vm.$.provides.cnDispatchAction(exportAction)
		await vueNextTick()
		// `vm.$refs` was a plain writable object under Vue 2. Vue 3 exposes it
		// as `shallowReadonly(instance.refs)` in dev, so writing through it is
		// REJECTED (a [Vue warn], no throw) and the stub dialog stays in place —
		// `setResult` would silently never be called. `vm.$.refs` is the same
		// raw object Vue 2's `$refs` was, and is writable.
		wrapper.vm.$.refs.exportDialog = { setResult }
		await wrapper.vm.onExportConfirm({ format: 'csv' })
		expect(warnSpy).toHaveBeenCalled()
		expect(setResult).toHaveBeenCalledWith({ error: expect.any(String) })
		warnSpy.mockRestore()
	})

	it('a rejecting handler reports the error into the dialog', async () => {
		const exportReport = jest.fn().mockRejectedValue(new Error('backend down'))
		const setResult = jest.fn()
		const wrapper = mountRenderer({ exportReport })
		wrapper.vm.$.provides.cnDispatchAction(exportAction)
		await vueNextTick()
		// See the note above: Vue 3's `vm.$refs` is shallowReadonly in dev.
		wrapper.vm.$.refs.exportDialog = { setResult }
		await wrapper.vm.onExportConfirm({ format: 'csv', entity: 'leads' })
		expect(setResult).toHaveBeenCalledWith({ error: 'backend down' })
	})

	it('closing the dialog clears the active export action', async () => {
		const wrapper = mountRenderer()
		wrapper.vm.$.provides.cnDispatchAction(exportAction)
		await vueNextTick()
		wrapper.findComponent({ name: 'CnMassExportDialog' }).vm.$emit('close')
		await vueNextTick()
		expect(wrapper.findComponent({ name: 'CnMassExportDialog' }).exists()).toBe(false)
	})
})
