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
	render() { return h('div') },
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
		w.unmount()
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
			render() { return h('div') },
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
		w.unmount()
	})

	test('enabled=false skips subscribe', async () => {
		const store = makeStore()
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(store, 'meeting', 'uuid-1', { enabled: false })
				return () => h('div')
			},
			render() { return h('div') },
		})
		const w = mount(Comp)
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(store.subscribe).not.toHaveBeenCalled()
		w.unmount()
	})

	test('enabled flips reactively', async () => {
		const store = makeStore()
		const enabled = ref(false)
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(store, 'meeting', 'uuid-1', { enabled })
				return () => h('div')
			},
			render() { return h('div') },
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
		w.unmount()
	})

	test('getter-function inputs resolve and stay reactive (CnDetailPage call shape)', async () => {
		const store = makeStore()
		const idRef = ref('uuid-1')
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(
					store,
					() => 'meeting',
					() => idRef.value,
					{ enabled: () => Boolean(idRef.value) },
				)
				return () => h('div')
			},
			render() { return h('div') },
		})
		const w = mount(Comp)
		await Promise.resolve()
		await w.vm.$nextTick()
		// The getter must be UNWRAPPED — subscribe receives the slug string,
		// not the getter function itself.
		expect(store.subscribe).toHaveBeenCalledWith('meeting', 'uuid-1')

		idRef.value = 'uuid-2'
		await w.vm.$nextTick()
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(store.subscribe).toHaveBeenCalledWith('meeting', 'uuid-2')
		w.unmount()
	})

	test('store without a subscribe action is a silent no-op', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const store = { liveLastEventAt: null } // e.g. created with liveUpdates: false
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(store, 'meeting', 'uuid-1')
				return () => h('div')
			},
			render() { return h('div') },
		})
		const w = mount(Comp)
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(warnSpy).not.toHaveBeenCalled()
		w.unmount()
		warnSpy.mockRestore()
	})

	// The openregister#402 stale-resolution pattern: subscribe() is async —
	// when it resolves AFTER the scope is gone, the handle must be released,
	// not stored.
	test('subscribe resolving after unmount releases the stale handle (epoch guard)', async () => {
		let resolveSubscribe
		const store = {
			liveLastEventAt: null,
			subscribe: jest.fn(() => new Promise((res) => { resolveSubscribe = res })),
			unsubscribe: jest.fn().mockResolvedValue(undefined),
		}
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(store, 'meeting', 'uuid-1')
				return () => h('div')
			},
			render() { return h('div') },
		})
		const w = mount(Comp)
		await w.vm.$nextTick()
		expect(store.subscribe).toHaveBeenCalledTimes(1)

		// Unmount while subscribe() is still in flight…
		w.unmount()
		await Promise.resolve()
		expect(store.unsubscribe).not.toHaveBeenCalled() // nothing held yet

		// …then the late resolution arrives: the handle must be released.
		resolveSubscribe('late-handle')
		await Promise.resolve()
		await Promise.resolve()
		expect(store.unsubscribe).toHaveBeenCalledWith('late-handle')
	})

	test('overlapping attaches leave exactly one live handle (double-subscribe guard)', async () => {
		const resolvers = []
		const store = {
			liveLastEventAt: null,
			subscribe: jest.fn(() => new Promise((res) => { resolvers.push(res) })),
			unsubscribe: jest.fn().mockResolvedValue(undefined),
		}
		const idRef = ref('uuid-1')
		const Comp = defineComponent({
			setup() {
				useObjectSubscription(store, 'meeting', idRef)
				return () => h('div')
			},
			render() { return h('div') },
		})
		const w = mount(Comp)
		await w.vm.$nextTick()
		expect(store.subscribe).toHaveBeenCalledTimes(1)

		// Change scope while the first subscribe() is still pending —
		// a second attach starts before the first resolved.
		idRef.value = 'uuid-2'
		await w.vm.$nextTick()
		expect(store.subscribe).toHaveBeenCalledTimes(2)

		// Resolve them out of order: first (stale) then second (current).
		resolvers[0]('handle-stale')
		resolvers[1]('handle-current')
		await Promise.resolve()
		await Promise.resolve()
		await Promise.resolve()

		// The stale handle was released; the current one is held.
		expect(store.unsubscribe).toHaveBeenCalledWith('handle-stale')
		expect(store.unsubscribe).not.toHaveBeenCalledWith('handle-current')

		// Unmount releases the current handle.
		w.unmount()
		await Promise.resolve()
		expect(store.unsubscribe).toHaveBeenCalledWith('handle-current')
	})
})
