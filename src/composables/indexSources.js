/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { translate as t } from '@nextcloud/l10n'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import { useFlowStore } from './useFlowStore.js'

/**
 * NAMED INDEX SOURCES.
 *
 * `CnIndexPage` has always had two modes: fetch OpenRegister objects itself
 * from `register` + `schema`, or render rows handed in as `:objects`. That
 * second mode is why bespoke list pages exist at all — anything that is not an
 * OpenRegister object needed its own page component whose only real job was to
 * load rows from somewhere else and pass them down.
 *
 * A flow is the clearest case: flow definitions are deliberately NOT stored as
 * OpenRegister objects, so `type: "index"` had nothing to point at, and every
 * app that wanted a flow list shipped a custom page instead.
 *
 * This registry is the third mode. A manifest names an entity source, and the index
 * page loads it — no component, no `type: "custom"`.
 *
 *   { "type": "index", "config": { "entitySource": "flows", "app": "dossiq" } }
 *
 * Each entry supplies the parts an index cannot infer: how to load, where the
 * rows live, and sensible columns and row actions so a manifest does not have
 * to restate them. A manifest that DOES set `columns` still wins — the source
 * only fills in what was left out.
 *
 * WHY A REGISTRY RATHER THAN A BRANCH. `logs`, the AVG register and the other
 * non-object lists are the same shape, and each one added as an `if` in the
 * index page is another reason the page cannot be reasoned about. Adding a
 * source here is a data change; adding one to the page is a behaviour change.
 */

/**
 * The flow source: OpenRegister's one native flow store.
 *
 * @return {object} The source adapter.
 */
function flowsSource() {
	const store = useFlowStore()

	return {
		store,

		/**
		 * Load the flows for the scoped app.
		 *
		 * @param {object} config The page config.
		 *
		 * @return {Promise<void>} Resolves when loaded.
		 */
		load: (config) => store.load({ app: config?.app }),

		/**
		 * @return {Array<object>} The rows, with the display status resolved.
		 */
		rows: () => (store.flows || []).map((flow) => ({
			...flow,
			// Enabled and dispatchable are NOT the same thing: a trigger fires
			// with no acting user, so a flow with no owner has no identity to
			// run as and will not start however enabled it looks.
			statusLabel: flow.enabled === false
				? t('nextcloud-vue', 'Disabled')
				: (flow.owner ? t('nextcloud-vue', 'Enabled') : t('nextcloud-vue', 'No owner')),
		})),

		/**
		 * @return {boolean} Whether a load is in flight.
		 */
		loading: () => !!store.loading,

		columns: [
			{ key: 'name', label: t('nextcloud-vue', 'Name') },
			{ key: 'description', label: t('nextcloud-vue', 'Description') },
			{ key: 'trigger', label: t('nextcloud-vue', 'Trigger') },
			{ key: 'cron', label: t('nextcloud-vue', 'Schedule') },
			{ key: 'statusLabel', label: t('nextcloud-vue', 'Status') },
		],

		rowActions: [
			{ label: t('nextcloud-vue', 'Edit'), icon: Pencil, action: 'open' },
		],

		// The surfaces a flow list needs beyond its rows. These are DEFAULTS a
		// manifest can override, not a fixed shape: `detailRoute` is the fleet
		// convention (`/flows/:id`) and the two routes below derive from it.
		//
		// A flow is created by navigating to the editor, NOT by the index page's
		// built-in form dialog — that dialog builds an OpenRegister object, and a
		// flow is not one. CnFlowsPage set `:show-add="false"` and rendered its
		// own button for exactly this reason; expressing it here is what lets the
		// custom page go.
		detailRoute: '/flows',
		addRoute: '/flows/new',
		addLabel: t('nextcloud-vue', 'New flow'),
		description: t('nextcloud-vue', 'A flow runs a series of steps when something happens — an object changes, a schedule fires, or you run it yourself.'),
		title: t('nextcloud-vue', 'Flows'),
	}
}

/**
 * The registered sources, by the name a manifest uses.
 *
 * @type {Record<string, Function>}
 */
export const indexSources = {
	flows: flowsSource,
}

/**
 * Resolve a named source.
 *
 * Returns null for an unknown name rather than throwing, and the caller warns:
 * a typo in a manifest should degrade to the ordinary empty index with a
 * console message naming the source, not white-screen the app. It must NOT
 * silently render an empty list with no explanation, because that is
 * indistinguishable from a source that genuinely has no rows.
 *
 * @param {string} name The source name from `config.source`.
 *
 * @return {object|null} The adapter, or null when the name is not registered.
 */
export function resolveIndexSource(name) {
	const key = String(name || '')
	if (!key) {
		return null
	}

	const factory = indexSources[key]
	if (typeof factory !== 'function') {
		console.warn(`[CnIndexPage] Unknown index source "${key}" — known sources: ${Object.keys(indexSources).join(', ')}. The list will be empty.`)
		return null
	}

	return factory()
}
