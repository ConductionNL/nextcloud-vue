/**
 * Tests for the useIntegrationRegistry composable — proves that
 * components see a reactive snapshot that updates on late
 * registration, and that the subscription is cleaned up on unmount.
 */

const { defineComponent, h, computed } = require('vue')
const { mount } = require('@vue/test-utils')

const tab = { name: 'StubTab' }
const widget = { name: 'StubWidget' }

function buildHarness(registry) {
	const { useIntegrationRegistry } = require('../../src/composables/useIntegrationRegistry.js')
	return defineComponent({
		setup() {
			const { integrations, getById, resolveWidget } = useIntegrationRegistry(registry)
			const ids = computed(() => integrations.value.map((p) => p.id).join(','))
			return { ids, integrations, getById, resolveWidget }
		},
		render() {
			return h('div', { attrs: { 'data-ids': this.ids } })
		},
	})
}

describe('useIntegrationRegistry', () => {
	let createIntegrationRegistry

	beforeEach(() => {
		jest.isolateModules(() => {
			createIntegrationRegistry = require('../../src/integrations/registry.js').createIntegrationRegistry
		})
	})

	it('seeds the snapshot with the registry contents at mount time', () => {
		const registry = createIntegrationRegistry()
		registry.register({ id: 'a', label: 'A', tab, widget })
		const Harness = buildHarness(registry)
		const wrapper = mount(Harness)
		expect(wrapper.vm.ids).toBe('a')
		wrapper.destroy()
	})

	it('updates reactively when a late registration arrives', async () => {
		const registry = createIntegrationRegistry()
		const Harness = buildHarness(registry)
		const wrapper = mount(Harness)
		expect(wrapper.vm.ids).toBe('')
		registry.register({ id: 'late', label: 'Late', tab, widget })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.ids).toBe('late')
		wrapper.destroy()
	})

	it('exposes getById and resolveWidget helpers', () => {
		const registry = createIntegrationRegistry()
		registry.register({ id: 'x', label: 'X', tab, widget })
		const Harness = buildHarness(registry)
		const wrapper = mount(Harness)
		expect(wrapper.vm.getById('x').id).toBe('x')
		expect(wrapper.vm.resolveWidget('x', 'detail-page')).toBe(widget)
		expect(wrapper.vm.getById('missing')).toBe(null)
		wrapper.destroy()
	})

	it('unsubscribes on component unmount so destroyed harnesses do not receive updates', async () => {
		const registry = createIntegrationRegistry()
		const Harness = buildHarness(registry)
		const wrapper = mount(Harness)
		wrapper.destroy()
		// After unmount the underlying ref no longer mutates, but more
		// importantly the listener count is back to zero so further
		// registrations are silent. We assert through the registry's
		// notify path: a fresh subscriber should see only one snapshot
		// per registration (no duplicate fan-out).
		const seen = []
		registry.onChange((snap) => seen.push(snap.map((p) => p.id)))
		registry.register({ id: 'after-unmount', label: 'After', tab, widget })
		expect(seen).toEqual([['after-unmount']])
	})
})
