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

module.exports = {
	...vtu,
	mount: (component, options) => vtu.mount(component, hoistGlobalOptions(options)),
	shallowMount: (component, options) => vtu.shallowMount(component, hoistGlobalOptions(options)),
}
