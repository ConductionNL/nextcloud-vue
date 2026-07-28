/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Process-wide single instance of the `vue` module.
 *
 * WHY THIS EXISTS
 *
 * `jest.isolateModules()` / `jest.resetModules()` create a brand-new module
 * registry, so every `require()` inside them returns a FRESH copy of the
 * module — including `vue` itself. 26 spec files in this repo use that to get
 * a clean widget/integration registry per test.
 *
 * Under Vue 2 a duplicated runtime was mostly harmless: component resolution
 * walked `this.$options.components` off the instance, and reactivity was
 * defined per-object via `Object.defineProperty`, so two Vue copies still
 * understood each other's objects.
 *
 * Vue 3 keeps critical state in MODULE-LEVEL variables inside
 * `@vue/runtime-core` — most importantly `currentRenderingInstance`, which
 * `resolveComponent()` reads, and `currentInstance`, which `inject()`,
 * `getCurrentInstance()` and the lifecycle hooks read. With two copies:
 *
 *   - `@vue/test-utils` mounts through Vue copy A and sets
 *     `currentRenderingInstance` there;
 *   - the SFC compiled by `@vue/vue3-jest` inside the isolated registry calls
 *     `resolveComponent()` from Vue copy B, whose `currentRenderingInstance`
 *     is still `null`.
 *
 * Copy B therefore warns "resolveComponent can only be used in render() or
 * setup()" and returns the *component name string* instead of the component,
 * so the child never mounts. The visible symptom is nothing like the cause:
 * `<component :is>` subtrees silently vanish, `$refs` stay empty, and the
 * spec fails on a downstream assertion ("commit was not called", "isValid is
 * false") with no error.
 *
 * Caching the resolved module on `globalThis` defeats the registry reset:
 * `globalThis` is the jsdom test global and survives `isolateModules`, so
 * every registry — isolated or not — hands back the one true Vue.
 *
 * `jest.config.js` maps `^vue$` here; deleting that mapping restores stock
 * behaviour.
 */

const path = require('path')

// Symbol.for() so the key is stable even if this shim is itself re-evaluated
// in a fresh registry (which is exactly what happens under isolateModules).
const KEY = Symbol.for('@conduction/nextcloud-vue:test:vue-runtime')

if (!globalThis[KEY]) {
	// Resolve by absolute path: a bare `require('vue')` would hit the
	// moduleNameMapper entry that points back at this file and recurse, and
	// `vue/index.js` is not listed in the package's `exports` map. `index.js`
	// is a two-line NODE_ENV switch over these two files, so pick directly.
	const dist = process.env.NODE_ENV === 'production'
		? 'vue.cjs.prod.js'
		: 'vue.cjs.js'
	globalThis[KEY] = require(path.join(__dirname, '../../node_modules/vue/dist', dist))
}

module.exports = globalThis[KEY]
