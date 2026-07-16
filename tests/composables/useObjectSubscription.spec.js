/**
 * Tests for useObjectSubscription — auto-subscribe lifecycle.
 *
 * Covers REQ-CO-LOCK-001: subscribe on mount, unsubscribe on unmount,
 * re-subscribe on reactive id change, gated by `enabled`.
 */

import { mount } from '@vue/test-utils'
import { ref, defineComponent, h } from 'vue'
import { useObjectSubscription } from '../../src/composables/useObjectSubscription.js'

function makeStore() {
	return {
		liveLastEventAt: null,
		subscribe: jest.fn().mockResolvedValue('handle-' + Math.random()),
		unsubscribe: jest.fn().mockResolvedValue(undefined),
	}
}

const Host = (composable) => defineComponent({
	props: ['store', 'type', 'id', 'enabled'],
	setup(props) {
		composable(props)
		return () => h('div')
	},
	render(h) { return h('div') },
})

describe('useObjectSubscription', () => {
	test('subscribes on mount, unsubscribes on unmount', async () => {
		const store = makeStore()
		const Comp = Host((props) =>
			useObjectSubscription(store, props.type, props.id),
		)
		const w = mount(Comp, { propsData: { store, type: 'meeting', id: 'uuid-1' } })
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(store.subscribe).toHaveBeenCalledTimes(1)
		expect(store.subscribe).toHaveBeenCalledWith('meeting', 'uuid-1')
		w.destroy()
		await Promise.resolve()
		expect(store.unsubscribe).toHaveBeenCalledTimes(1)
	})

	test('reactive id flip releases the previous handle', async () => {
		const store = makeStore()
		const idRef = ref('uuid-1')
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(store, 'meeting', idRef)
				return () => h('div')
			},
			render(h) { return h('div') },
		})
		const w = mount(Comp)
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(store.subscribe).toHaveBeenCalledWith('meeting', 'uuid-1')

		idRef.value = 'uuid-2'
		await w.vm.$nextTick()
		await Promise.resolve()
		await w.vm.$nextTick()

		expect(store.unsubscribe).toHaveBeenCalled()
		expect(store.subscribe).toHaveBeenCalledWith('meeting', 'uuid-2')
		w.destroy()
	})

	test('enabled=false skips subscribe', async () => {
		const store = makeStore()
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(store, 'meeting', 'uuid-1', { enabled: false })
				return () => h('div')
			},
			render(h) { return h('div') },
		})
		const w = mount(Comp)
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(store.subscribe).not.toHaveBeenCalled()
		w.destroy()
	})

	test('enabled flips reactively', async () => {
		const store = makeStore()
		const enabled = ref(false)
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(store, 'meeting', 'uuid-1', { enabled })
				return () => h('div')
			},
			render(h) { return h('div') },
		})
		const w = mount(Comp)
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(store.subscribe).not.toHaveBeenCalled()

		enabled.value = true
		await w.vm.$nextTick()
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(store.subscribe).toHaveBeenCalledTimes(1)
		w.destroy()
	})
})
