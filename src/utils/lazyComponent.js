/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { defineComponent, h, markRaw, shallowRef } from 'vue'

/**
 * A component that loads its real definition on first render, for the widget
 * registry and other places that keep component references in data.
 *
 * Unlike `defineAsyncComponent`, the resolved definition is held in a ref, so
 * a computed that inspects it through {@link resolveLazyComponent} (declared
 * props, for example) recomputes once the module arrives. The wrapper takes
 * no attributes of its own: every attribute, listener and slot goes to the
 * loaded component, and a template ref on the wrapper reaches the loaded
 * component's public instance.
 *
 * @param {() => Promise<object>} loader Returns the module (its `default` is used) or the component.
 * @param {string} [name] Name of the loaded component; the wrapper is called `Lazy<name>`.
 * @return {object} The wrapper component.
 */
export function lazyComponent(loader, name = 'Component') {
	const resolved = shallowRef(null)
	let pending = null

	const load = () => {
		if (resolved.value) {
			return Promise.resolve(resolved.value)
		}
		if (!pending) {
			pending = Promise.resolve()
				.then(loader)
				.then((mod) => {
					const component = mod && mod.default ? mod.default : mod
					resolved.value = markRaw(component)
					return component
				})
				.catch((error) => {
					pending = null
					// eslint-disable-next-line no-console
					console.error(`[nextcloud-vue] ${name}: the component could not be loaded`, error)
					return null
				})
		}
		return pending
	}

	return markRaw(defineComponent({
		name: `Lazy${name}`,
		inheritAttrs: false,
		__cnLazy: { resolved, load },
		setup(props, { attrs, slots, expose }) {
			const inner = shallowRef(null)
			expose(new Proxy({}, {
				get: (target, key) => (inner.value ? inner.value[key] : undefined),
				has: (target, key) => Boolean(inner.value) && key in inner.value,
			}))
			load()
			return () => (resolved.value ? h(resolved.value, { ...attrs, ref: inner }, slots) : null)
		},
	}))
}

/**
 * The definition behind a {@link lazyComponent} wrapper once it has loaded,
 * `null` while it is loading, and any other component unchanged. Reading it
 * inside a computed makes that computed follow the load.
 *
 * @param {object|null} component A component definition.
 * @return {object|null} The definition to inspect.
 */
export function resolveLazyComponent(component) {
	if (component && component.__cnLazy) {
		return component.__cnLazy.resolved.value
	}
	return component || null
}

/**
 * Load the definition behind a {@link lazyComponent} wrapper ahead of its
 * first render. Resolves to the component itself for any other value.
 *
 * @param {object|null} component A component definition.
 * @return {Promise<object|null>} The loaded definition.
 */
export function loadLazyComponent(component) {
	if (component && component.__cnLazy) {
		return component.__cnLazy.load()
	}
	return Promise.resolve(component || null)
}
