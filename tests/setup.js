/**
 * Jest test setup — provides Nextcloud global mocks.
 *
 * Vue 3 line: this file used to force pinia's bundled `vue-demi` into Vue-2
 * mode (`isVue2 = true`, shimming `Vue.set`/`Vue.delete`) and install the
 * Vue-2-only `PiniaVuePlugin`. Both are wrong under Vue 3 — pinia 2 targets
 * Vue 3 natively, and Vue 3 has no global `Vue.use` / `Vue.mixin` at all
 * (globals are per-app). The Vue-3 equivalents go through `@vue/test-utils`'
 * global mount config instead.
 */

// Polyfill structuredClone for Node < 17 / jsdom
if (typeof global.structuredClone === 'undefined') {
	global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}

// Mock the global OC object that Nextcloud provides
global.OC = {
	requestToken: 'test-token-12345',
	webroot: '',
	config: {
		session_lifetime: 86400,
	},
}

// Mock window.fetch if not available in jsdom
if (!global.fetch) {
	global.fetch = jest.fn()
}

const { config } = require('@vue/test-utils')
const { createPinia, setActivePinia } = require('pinia')
const { translate, translatePlural } = require('@nextcloud/l10n')

// A fresh pinia per test keeps store state from leaking across specs. It is
// both installed into every mounted component (`global.plugins`) and made the
// active instance, so `useSomeStore()` called outside a component — as several
// specs do — resolves too.
beforeEach(() => {
	const pinia = createPinia()
	setActivePinia(pinia)
	config.global.plugins = [pinia]
})

// VTU v1 rendered a stubbed component's default slot; v2 does NOT unless this
// is set. Without it, any `shallowMount` of a component whose root is a
// wrapper (e.g. CnWidgetObjectTable's `<component :is="CnWidgetWrapper">`)
// loses its entire subtree, so `findComponent` returns an empty wrapper and
// the spec fails with "Cannot call props on an empty VueWrapper" — nowhere
// near the actual cause. Restoring the v1 behaviour keeps those specs
// asserting what they were written to assert.
config.global.renderStubDefaultSlot = true

// Register t/n for every mounted component — consumer apps normally do this
// via `app.mixin({ methods: { t, n } })` in their main.js. Mirror that here so
// components using `{{ t('nextcloud-vue', '...') }}` in templates render.
config.global.mocks = {
	...config.global.mocks,
	t: translate,
	n: translatePlural,
}

// ResizeObserver — jsdom does not implement it, and Vue Flow needs it to
// measure nodes. That measurement is a FEATURE, not an accident: it is what
// let CnGraphCanvas drop the `nodeWidth`/`nodeHeight` props the hand-rolled
// canvas needed so its edges could guess where a node's centre was.
//
// A no-op observer is the right stub for jsdom, which has no layout: it never
// reports a size change because nothing ever resizes. Tests that care about
// geometry belong in the Playwright e2e, where a real browser lays the canvas
// out.
if (typeof globalThis.ResizeObserver === 'undefined') {
	globalThis.ResizeObserver = class ResizeObserver {

		/** @return {void} */
		observe() {}

		/** @return {void} */
		unobserve() {}

		/** @return {void} */
		disconnect() {}

	}
}
