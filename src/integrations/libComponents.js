/**
 * Local component map for lib-owned integrations.
 *
 * Built by iterating `builtinIntegrations` (the 5 core + 19 bespoke
 * pairs that ship with this library) and indexing by integration id.
 * The component references in this map are resolved by whichever
 * bundle imports this module — so the rendering bundle's
 * `useIntegrationRegistry().resolveTab/.resolveWidget` can return a
 * component whose composition-API `setup()` is bound to THAT bundle's
 * Vue instance, regardless of which bundle originally called
 * `register()` for the same id.
 *
 * This sidesteps the dual-runtime trap of the ADR-019 registry: when
 * one bundle (e.g. OpenRegister's `integration-global` init script)
 * registers component objects into the shared `window` singleton, and
 * another bundle (e.g. an app's `main` SPA bundle) renders them, the
 * registered components' `setup()` closes over the registering
 * bundle's Vue copy. The composition-API `inject()` inside
 * `NcButton` (`useNcFormBox`) then has no active instance on the
 * rendering bundle's Vue → returns `undefined` → destructuring throws.
 * Resolving lib-owned ids against THIS module instead keeps the
 * rendered component bound to the rendering bundle's Vue.
 *
 * Custom consumer integrations (not in this map) continue to resolve
 * via the shared registry's stored component objects — those live in
 * the consumer's own bundle and render under the same Vue instance,
 * so no cross-bundle mismatch arises.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * @see openregister#1958
 * @see ADR-019 Pluggable Integration Registry
 */

import { builtinIntegrations } from './builtin/index.js'

/**
 * Map of integration id → component refs, resolved per-bundle.
 *
 * Shape: `{ [id]: { tab, widget, widgetCompact, widgetExpanded, widgetEntity } }`.
 * Components are the same objects the descriptors in
 * `builtinIntegrations` carry; only the keys carry over so callers
 * don't accidentally store metadata that could go stale.
 *
 * @type {Record<string, { tab: object, widget: object, widgetCompact: ?object, widgetExpanded: ?object, widgetEntity: ?object }>}
 */
export const LIB_INTEGRATION_COMPONENTS = (() => {
	const map = Object.create(null)
	for (const descriptor of builtinIntegrations) {
		if (!descriptor || typeof descriptor.id !== 'string') {
			continue
		}
		map[descriptor.id] = {
			tab: descriptor.tab,
			widget: descriptor.widget,
			widgetCompact: descriptor.widgetCompact || null,
			widgetExpanded: descriptor.widgetExpanded || null,
			widgetEntity: descriptor.widgetEntity || null,
		}
	}
	return map
})()
