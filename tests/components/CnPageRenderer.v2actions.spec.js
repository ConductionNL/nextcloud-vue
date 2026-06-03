/**
 * Integration test: CnPageRenderer v2 path wires cnDispatchAction via provide.
 *
 * Covers REQ-MVR-012 (manifest-v2-renderer) task 12.4:
 * - Mounting CnPageRenderer in v2 mode provides cnDispatchAction
 * - Dispatching an open-modal action reaches cnOpenModal inject
 */

import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'

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
		expect(typeof wrapper.vm._provided.cnDispatchAction).toBe('function')
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
		const dispatch = wrapper.vm._provided.cnDispatchAction
		dispatch({ type: 'open-modal', target: 'my-modal', props: { title: 'Hello' } })
		expect(openModal).toHaveBeenCalledWith('my-modal', { title: 'Hello' })
	})

	it('cnDispatchAction routes navigate to $router.push', () => {
		const push = jest.fn()
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest: v2Manifest },
			mocks: { $route: { name: 'home', params: {} }, $router: { push } },
		})
		const dispatch = wrapper.vm._provided.cnDispatchAction
		dispatch({ type: 'navigate', target: '/custom/path' })
		expect(push).toHaveBeenCalledWith('/custom/path')
	})
})
