/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * useSpecRef — resolve the context-aware capability slug for a widget or page.
 *
 * Reads from (in order):
 *   1. The nearest ancestor component's `$options.specRef` value
 *      (set via `defineOptions({ specRef: 'foo' })` Composition API or
 *      `specRef: 'foo'` Options API component-option).
 *   2. The active Vue Router route's `meta.specRef` value.
 *   3. `null` when neither source provides a value.
 *
 * The slug convention is kebab-case, identical to ADR-008 `@spec` PHPDoc
 * annotations on the backend.
 *
 * Spec: features-roadmap-component — Requirement "useSpecRef composable"
 * (`openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`).
 *
 * @module composables/useSpecRef
 */

/**
 * Walk up the component tree looking for a `specRef` option, then fall back
 * to the active route's `meta.specRef`. Returns `null` when no source supplies
 * a value.
 *
 * Designed for the Options API: pass the current component instance (`this`)
 * as the `vm` argument. Composition API consumers can pass `getCurrentInstance().proxy`.
 *
 * @param {Object} vm The Vue component instance (typically `this`).
 * @return {string|null} The resolved kebab-case slug, or `null`.
 *
 * @example
 *   // In an Options API component:
 *   export default {
 *     specRef: 'catalog-management',
 *     mounted() {
 *       this.slug = useSpecRef(this)  // -> 'catalog-management'
 *     },
 *   }
 */
export function useSpecRef(vm) {
	if (vm === null || typeof vm !== 'object') {
		return null
	}

	// Walk ancestors first — most specific (widget itself) before broader (page route).
	let current = vm
	while (current !== null && current !== undefined) {
		const opts = current.$options
		if (opts !== null && opts !== undefined) {
			const slug = opts.specRef
			if (typeof slug === 'string' && slug.length > 0) {
				return slug
			}
		}
		current = current.$parent
	}

	// Route fallback.
	const route = vm.$route
	if (route !== null && route !== undefined) {
		const meta = route.meta
		if (meta !== null && meta !== undefined) {
			const metaSlug = meta.specRef
			if (typeof metaSlug === 'string' && metaSlug.length > 0) {
				return metaSlug
			}
		}
	}

	return null
}
