/**
 * Regression: a host listener bound on CnPageRenderer must reach the
 * dispatched page component under Vue 3. Manifest apps rely on this so a
 * host-supplied `@add` / `@create` handler (e.g. openconnector's
 * MappingsPageRenderer) reaches the built-in CnIndexPage. In Vue 3 the
 * listener arrives as an `onXxx` key in `$attrs`; with `inheritAttrs:false`
 * CnPageRenderer re-binds `$attrs` onto the dispatched `<component :is>`.
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'

const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const manifest = {
	$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	pages: [
		{ id: 'Sources', route: '/sources', type: 'index', title: 'Sources', config: { register: 'oc', schema: 'source' } },
	],
}

// Stub page that emits `create` when its button is clicked — stands in for
// CnIndexPage emitting @create / @edit / @delete to the host.
const StubIndex = {
	name: 'StubIndex',
	template: '<button class="go" @click="$emit(\'create\', { name: \'x\' })">go</button>',
}

describe('CnPageRenderer host-listener forwarding (Vue 3)', () => {
	it('forwards @create bound on CnPageRenderer down to the dispatched page', async () => {
		const onCreate = jest.fn()
		const wrapper = mount(CnPageRenderer, {
			props: { manifest, pageTypes: { index: StubIndex } },
			attrs: { onCreate },
			global: {
				mocks: { $route: { name: 'Sources', params: {} }, $router: { push: jest.fn(() => Promise.resolve()) } },
			},
		})
		await wrapper.find('button.go').trigger('click')
		expect(onCreate).toHaveBeenCalledWith({ name: 'x' })
	})

	// Mirrors openconnector's MappingsPageRenderer exactly: a shallow clone of
	// CnPageRenderer rendered via `h(clone, { onAdd })`. Proves onAdd falls
	// through to the dispatched page even through the clone + h() wrapper.
	it('forwards onAdd through a shallow-clone wrapper (openconnector pattern)', async () => {
		const onAdd = jest.fn()
		const Clone = { ...CnPageRenderer }
		const StubIndexAdd = { name: 'StubIndexAdd', template: '<button class="add" @click="$emit(\'add\')">add</button>' }
		const Wrapper = {
			name: 'Wrapper',
			render() {
				return h(Clone, { onAdd, manifest, pageTypes: { index: StubIndexAdd } })
			},
		}
		const wrapper = mount(Wrapper, {
			global: { mocks: { $route: { name: 'Sources', params: {} }, $router: { push: jest.fn(() => Promise.resolve()) } } },
		})
		await wrapper.find('button.add').trigger('click')
		expect(onAdd).toHaveBeenCalled()
	})
})
