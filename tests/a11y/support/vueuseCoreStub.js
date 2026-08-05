/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `@vueuse/core` stub for the `check:a11y` lane.
 *
 * `@vueuse/core` is a PEER dependency of this package and is NOT installed
 * in its own node_modules (only a couple of stray subpath folders exist,
 * so it does not resolve as a package). The repo's main `jest.config.js`
 * gets away with a one-function stub (`tests/__mocks__/vueuse-core.js`,
 * just `tryOnScopeDispose`) because behavioural specs mock `@nextcloud/vue`
 * away entirely. The a11y lane cannot: it mounts REAL `@nextcloud/vue`
 * components (NcDialog/NcModal/NcAppSidebar/...), and those call a handful
 * of real `@vueuse/core` composables — `useElementSize`, `useSwipe`,
 * `useIntersectionObserver`, `useFocusWithin`, `useVModel`, `whenever`,
 * `toRef`, `toValue` — during setup/mount. A stub missing any of them
 * throws `core.<fn> is not a function` and aborts the mount.
 *
 * Every composable below is a behaviour-free stand-in: these are all
 * gesture / element-measurement / observer utilities that have ZERO effect
 * on the ARIA markup axe-core inspects (swipe direction, rendered pixel
 * size, intersection ratios, focus-within tracking). Stubbing them to
 * inert refs is therefore safe for accessibility assertions — it lets the
 * real component render its real DOM without pulling in a package that
 * isn't installed. Reactive primitives (`ref`, `computed`, `watch`,
 * `toRef`, `unref`) are delegated to Vue 2.7's built-ins so anything the
 * components actually read stays reactive.
 *
 * The list is derived from `grep -rhoE 'core\.[a-zA-Z]+'` over
 * `@nextcloud/vue/dist/chunks/*.cjs`; extend it if a newly-covered
 * component calls a composable not yet stubbed here (the failure is
 * always the same clear `core.<fn> is not a function`).
 */
const Vue = require('vue')

const ref = Vue.ref
const computed = Vue.computed
const unref = Vue.unref
const isRef = Vue.isRef

module.exports = {
	__esModule: true,

	// Kept identical in spirit to tests/__mocks__/vueuse-core.js — our own
	// composables (e.g. useObjectSubscription) call this on teardown.
	tryOnScopeDispose: jest.fn(),

	// Reactive helpers — delegate to Vue 2.7 built-ins where available.
	toRef: Vue.toRef ? Vue.toRef : (obj, key) => computed(() => (isRef(obj) ? unref(obj)[key] : obj[key])),
	toValue: (v) => (typeof v === 'function' ? v() : unref(v)),

	/**
	 * Minimal `useVModel` — a writable computed that reads the prop and
	 * emits the conventional update event on write. Enough for real
	 * components that bind a v-model'd prop during setup.
	 *
	 * @param {object} props The component props object.
	 * @param {string} [key] The prop name to proxy.
	 * @param {Function} [emit] The component's emit function.
	 * @param {object} [options] Options; `eventName` overrides `update:<key>`.
	 * @return {object} A writable computed ref.
	 */
	useVModel(props, key = 'value', emit, options = {}) {
		const event = options.eventName || `update:${key}`
		return computed({
			get: () => props[key],
			set: (val) => { if (emit) emit(event, val) },
		})
	},

	// Observers / gesture / measurement composables — inert (no bearing on ARIA).
	useElementSize: () => ({ width: ref(0), height: ref(0) }),
	useSwipe: () => ({
		isSwiping: ref(false),
		direction: ref(null),
		lengthX: ref(0),
		lengthY: ref(0),
		stop: () => {},
	}),
	useIntersectionObserver: () => ({ stop: () => {}, isActive: ref(false) }),
	useFocusWithin: () => ({ focused: ref(false) }),

	/**
	 * `whenever(source, cb)` — run `cb` when `source` becomes truthy. Wired
	 * to Vue's `watch` so it stays behaviourally close without side effects
	 * at mount time.
	 *
	 * @param {object|Function} source A ref or getter to watch.
	 * @param {Function} cb The callback to run on a truthy value.
	 * @return {Function} A stop handle (no-op if watch is unavailable).
	 */
	whenever(source, cb) {
		if (typeof Vue.watch === 'function') {
			return Vue.watch(source, (value) => { if (value) cb(value) })
		}
		return () => {}
	},
}
