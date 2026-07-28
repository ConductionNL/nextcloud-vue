/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Vue Test Utils v1 -> v2 mount-options adapter.
 *
 * WHY THIS EXISTS
 *
 * VTU v2 moved the per-mount environment options under a `global` key:
 *
 *   v1: mount(C, { stubs, provide, mocks, directives, plugins, components })
 *   v2: mount(C, { global: { stubs, provide, mocks, directives, plugins, components } })
 *
 * The dangerous part is that v2 does not warn or throw on the v1 shape — it
 * SILENTLY IGNORES those keys. A spec that stubs a heavy child still mounts
 * the real child, a spec that provides an injection key mounts without it,
 * and the failure surfaces far away as a confusing assertion or a null-deref
 * deep inside an unrelated component. Roughly 100 spec files in this repo use
 * the v1 shape (73 `stubs`, 58 `provide`, 51 `mocks`).
 *
 * Rewriting ~100 files by hand is a large structural edit with a real chance
 * of silently changing what a spec asserts. This adapter instead hoists the
 * v1 keys into `global` at call time, which preserves each spec's intent
 * exactly and is trivially reversible: `jest.config.js` maps
 * `@vue/test-utils` here, so deleting the mapping restores stock behaviour.
 *
 * It is a migration aid, not a permanent fixture — specs should be moved to
 * the native `global: { ... }` shape over time, and this file deleted once
 * `grep -rE '^\s+(stubs|provide|mocks): ' tests/ src/` comes back empty.
 *
 * `propsData` is deliberately NOT touched: v2 still accepts it as an alias
 * for `props`.
 */

// Resolve the real module by absolute path. Requiring '@vue/test-utils' here
// would hit the moduleNameMapper entry that points at this file and recurse
// forever, and the bare subpath is blocked by the package's `exports` map —
// so go through the filesystem directly.
const path = require('path')
const vtu = require(path.join(__dirname, '../../node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js'))

/** Mount options that v1 accepted at the top level and v2 expects under `global`. */
const HOISTED_KEYS = [
	'stubs',
	'provide',
	'mocks',
	'directives',
	'plugins',
	'components',
	'config',
	'renderStubDefaultSlot',
]

/**
 * Move any v1-style top-level environment options into `global`, leaving an
 * explicit `global` block the caller already wrote as the winner on conflict.
 *
 * @param {object} [options] Mount options as the spec wrote them.
 * @return {object} Options in the shape VTU v2 expects.
 */
function hoistGlobalOptions(options) {
	if (!options || typeof options !== 'object') {
		return options
	}
	// VTU v1 separated `slots` from `scopedSlots`; v2 merged them — every slot
	// is a function now, so `scopedSlots` is simply gone and, like the keys
	// below, is IGNORED WITHOUT WARNING. A spec that supplies a widget body
	// through `scopedSlots` therefore mounts with no body at all, and fails on
	// some far-away assertion about what the parent rendered. 28 specs here
	// use it. Merge it into `slots`, with an explicit `slots` entry winning.
	if (Object.prototype.hasOwnProperty.call(options, 'scopedSlots')) {
		options = { ...options, slots: { ...options.scopedSlots, ...(options.slots || {}) } }
		delete options.scopedSlots
	}
	const hoisted = {}
	let found = false
	for (const key of HOISTED_KEYS) {
		if (Object.prototype.hasOwnProperty.call(options, key)) {
			hoisted[key] = options[key]
			found = true
		}
	}
	if (!found) {
		return options
	}
	const next = { ...options }
	for (const key of HOISTED_KEYS) {
		delete next[key]
	}
	// An explicitly-written `global` block wins — it is already v2 syntax and
	// therefore states the author's current intent.
	next.global = { ...hoisted, ...(options.global || {}) }
	return next
}

/**
 * Restore VTU v1's `wrapper.vm` — the component's REACTIVE public instance.
 *
 * WHY
 *
 * When a component has a `setup()`, VTU v2 does not hand back the instance
 * proxy. It substitutes `createVMProxy(vm, vm.$.setupState)`, whose lookup
 * order is exposed -> setupState -> globalProperties -> `vm.$.ctx[key]`.
 * That last fallback is where `data()` state is read from, and it is a
 * DEV-ONLY convenience accessor Vue installs in `applyOptions`:
 *
 *   Object.defineProperty(ctx, key, { get: () => data[key], set: NOOP })
 *
 * `data` there is the RAW object captured before `instance.data =
 * reactive(data)`. So `wrapper.vm.someObject` returns an unwrapped, untracked
 * plain object, and — because the descriptor's setter is `NOOP` — a write is
 * silently swallowed.
 *
 * Under Vue 2 + VTU v1 `wrapper.vm` was the real instance, so the idiom
 *
 *   wrapper.vm.chrome.showTitle = true
 *   await wrapper.vm.$nextTick()
 *   expect(wrapper.vm.isDirty).toBe(true)
 *
 * drove reactivity exactly like a user interaction. Under v2 the mutation
 * lands on the raw object: no dep is notified, dependent computeds keep their
 * cached value, and the template never re-renders. Nothing throws and nothing
 * warns — the spec just fails on a stale assertion far from the write.
 *
 * Returning `instance.proxy` puts the reactive object back. It resolves the
 * same names in the same order (setupState -> data -> props -> ctx ->
 * globalProperties), so nothing a spec could already read is lost. The
 * `exposed` branch is kept ahead of it for parity with stock v2; this library
 * has no `expose()` call today, but a future one should not silently change
 * what `wrapper.vm` means.
 *
 * Applies to every wrapper, including the children `findComponent()` returns.
 */
const vmDescriptor = Object.getOwnPropertyDescriptor(vtu.VueWrapper.prototype, 'vm')
Object.defineProperty(vtu.VueWrapper.prototype, 'vm', {
	configurable: true,
	get() {
		const wrapped = vmDescriptor.get.call(this)
		// `wrapped.$` resolves to the internal instance through either shape
		// (VTU's proxy forwards it via ctx). Functional components have no vm.
		const instance = wrapped && wrapped.$
		if (!instance || !instance.proxy) {
			return wrapped
		}
		if (instance.exposed && instance.exposeProxy) {
			return wrapped
		}
		return instance.proxy
	},
})

module.exports = {
	...vtu,
	mount: (component, options) => vtu.mount(component, hoistGlobalOptions(options)),
	shallowMount: (component, options) => vtu.shallowMount(component, hoistGlobalOptions(options)),
}
