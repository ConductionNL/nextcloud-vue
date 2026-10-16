/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/*
 * `process.env.NODE_ENV` is substituted by every consuming app's bundler at
 * build time; see NcSelectTags.js.
 */
/* global process */

import { camelize } from 'vue'

const warned = new Set()

/**
 * Add the prop names one component options object declares, following its
 * `extends` and `mixins`.
 *
 * @param {object} options A component options object.
 * @param {Set<string>} names The set to add camelCase prop names to.
 * @param {number} depth Recursion guard.
 */
function collect(options, names, depth) {
	if (!options || typeof options !== 'object' || depth > 8) {
		return
	}
	const props = options.props
	if (Array.isArray(props)) {
		props.forEach((name) => names.add(camelize(String(name))))
	} else if (props && typeof props === 'object') {
		Object.keys(props).forEach((name) => names.add(camelize(name)))
	}
	collect(options.extends, names, depth + 1)
	if (Array.isArray(options.mixins)) {
		options.mixins.forEach((mixin) => collect(mixin, names, depth + 1))
	}
}

/**
 * The prop names a component declares, or `null` when it takes every
 * attribute itself and so must keep receiving all of them:
 *  - `inheritAttrs: false`: the component forwards `$attrs` on purpose;
 *  - a functional component without `props`: its attrs are its props;
 *  - an async component that has not resolved yet.
 *
 * @spec openspec/changes/dashboard-declared-widget-props/specs/dashboard-page/spec.md#requirement-a-dashboard-widget-receives-only-the-content-keys-it-declares
 * @param {object|((...args: unknown[]) => unknown)|null} component A component definition.
 * @return {Set<string>|null} camelCase prop names, or null for "all".
 */
export function declaredPropNames(component) {
	if (!component) {
		return null
	}
	if (typeof component === 'function') {
		if (!component.props) {
			return null
		}
		const names = new Set()
		collect({ props: component.props }, names, 0)
		return names
	}
	if (typeof component !== 'object') {
		return null
	}
	if (component.__asyncLoader) {
		return component.__asyncResolved ? declaredPropNames(component.__asyncResolved) : null
	}
	const chain = [component, component.extends, ...(component.mixins || [])]
	if (chain.some((options) => options && options.inheritAttrs === false)) {
		return null
	}
	const names = new Set()
	collect(component, names, 0)
	return names
}

/**
 * Keep the entries of `bindings` whose key `component` declares as a prop.
 * A component for which {@link declaredPropNames} returns null gets every
 * entry. A dropped key is warned about once outside production when the
 * component has no `content` prop either, so the key reaches nothing.
 *
 * @spec openspec/changes/dashboard-declared-widget-props/specs/dashboard-page/spec.md#requirement-a-dashboard-widget-receives-only-the-content-keys-it-declares
 * @param {object|((...args: unknown[]) => unknown)|null} component The component that will receive the bindings.
 * @param {object} bindings The candidate bindings.
 * @param {string} label Names the component in the warning (for example the widget type).
 * @return {object} The bindings the component declares.
 */
export function pickDeclaredProps(component, bindings, label) {
	const declared = declaredPropNames(component)
	if (!declared || !bindings || typeof bindings !== 'object') {
		return bindings
	}
	const out = {}
	for (const [key, value] of Object.entries(bindings)) {
		if (declared.has(camelize(key))) {
			out[key] = value
			continue
		}
		if (process.env.NODE_ENV !== 'production' && !declared.has('content') && !warned.has(`${label}\u0000${key}`)) {
			warned.add(`${label}\u0000${key}`)
			// eslint-disable-next-line no-console
			console.warn(`[nextcloud-vue] content key "${key}" is not passed to widget "${label}": it declares neither that prop nor \`content\`.`)
		}
	}
	return out
}

/**
 * Forget which keys were warned about. For tests.
 */
export function resetDeclaredPropWarnings() {
	warned.clear()
}
