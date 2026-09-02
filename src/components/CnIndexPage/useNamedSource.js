/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { computed, onMounted, watch } from 'vue'
import { resolveIndexSource } from '../../composables/indexSources.js'

/**
 * Third data mode for CnIndexPage: a NAMED source.
 *
 * The page already knew two ways to get rows — fetch OpenRegister objects from
 * `register` + `schema`, or accept them as `:objects`. Neither reaches a list
 * that is not an OpenRegister object and not already in a parent's hands, so
 * those lists became `type: "custom"` pages whose only real job was loading
 * rows from somewhere else.
 *
 * `source` closes that: the manifest names a source and the index loads it.
 *
 * Precedence is deliberate and narrow. NON-EMPTY `:objects` still wins, so a
 * parent that hands rows down is never overridden by a source it did not ask
 * for; and a source wins over `register`/`schema`, because naming both is a
 * contradiction and silently self-fetching would render the WRONG list rather
 * than an obviously empty one.
 *
 * Note the test is "has rows", not "was the prop passed" — `useSelfFetchList`
 * uses the latter. The difference only shows for `:objects="[]"` alongside a
 * source, where the source wins; that is the useful reading of an empty array
 * next to an explicit source name.
 *
 * Quick filters (cn-tasks-entity-source): a source may supply its own tabs
 * (`quickFilters`, same `{ label, filter, default? }` shape the manifest
 * uses). A manifest that declares `config.quickFilters` still wins. The
 * active tab's filter is merged OVER `sourceConfig` into every load, tab
 * winning on a colliding key, the same precedence self-fetch gives its tabs.
 * The default tab is seeded BEFORE the watcher registers, so mounting issues
 * exactly one request. Single mode only: `quickFilterMultiple` unions filter
 * maps for an OpenRegister query, which a source loader has no grammar for.
 *
 * @param {object} props The CnIndexPage props.
 * @param {object} [options] Wiring handed down by CnIndexPage's setup.
 * @param {import('vue').Ref<number|null>} [options.activeQuickFilterIndex]
 *   The shared tab-index ref `useSelfFetchList` owns (it exists even when
 *   self-fetch is off); this composable seeds and watches it.
 *
 * @return {object} { isNamedSource, namedSource, namedRows, namedLoading, namedQuickFilters }
 */
export function useNamedSource(props, options = {}) {
	const objectsProvided = !!(props.objects && props.objects.length > 0)
	const isNamedSource = !!props.entitySource && !objectsProvided

	if (!isNamedSource) {
		return {
			isNamedSource: false,
			namedSource: null,
			namedRows: computed(() => []),
			namedLoading: computed(() => false),
			namedQuickFilters: null,
		}
	}

	const source = resolveIndexSource(props.entitySource)

	// An unknown source name resolves to null and was already warned about.
	// The page then behaves as an empty index rather than throwing.
	if (!source) {
		return {
			isNamedSource: true,
			namedSource: null,
			namedRows: computed(() => []),
			namedLoading: computed(() => false),
			namedQuickFilters: null,
		}
	}

	// Effective tabs: the manifest's own strip wins, the source's is the
	// default. Both flow into the SAME load-merge below, so a manifest tab
	// can steer a source loader too.
	const manifestTabs = (Array.isArray(props.quickFilters) && props.quickFilters.length > 0)
		? props.quickFilters
		: null
	const sourceTabs = (Array.isArray(source.quickFilters) && source.quickFilters.length > 0)
		? source.quickFilters
		: null
	const tabs = manifestTabs || sourceTabs
	const activeIndex = options.activeQuickFilterIndex || null

	// Seed the default tab before the watcher below registers: the mount load
	// already carries this tab's filter, so the seed must not fire a second
	// request. `useSelfFetchList` resolved the index from the PROP only, so
	// source-supplied tabs arrive with the ref still null.
	if (tabs && activeIndex && activeIndex.value === null) {
		const di = tabs.findIndex((tab) => tab && tab.default === true)
		activeIndex.value = di >= 0 ? di : 0
	}

	/**
	 * Load the source with the active tab's filter merged over the page's
	 * `sourceConfig` (tab wins on a colliding key).
	 *
	 * @return {Promise<void>} Resolves when the load settles.
	 */
	const loadActive = async () => {
		const idx = activeIndex ? activeIndex.value : null
		const tab = (tabs && idx !== null && idx !== undefined) ? tabs[idx] : null
		const config = { ...(props.sourceConfig || {}), ...((tab && tab.filter) || {}) }
		try {
			await source.load(config)
		} catch (error) {
			// Surfaced, not swallowed: a failed load and an empty source look
			// identical in the table, and only one of them is a problem.
			console.error(`[CnIndexPage] entitySource "${props.entitySource}" failed to load`, error)
		}
	}

	onMounted(loadActive)

	// Registered AFTER the seed above, so only a person switching tabs
	// reloads. Without tabs there is nothing to watch.
	if (tabs && activeIndex) {
		watch(activeIndex, loadActive)
	}

	// No manual invalidation tick here on purpose. The adapters read from a
	// reactive store, so a computed that calls into them tracks it the ordinary
	// way. A hand-cranked counter would REPLACE that reactivity rather than add
	// to it, and would then miss every update that did not go through load() —
	// a flow renamed in the editor, for instance.
	return {
		isNamedSource: true,
		namedSource: source,
		namedRows: computed(() => source.rows() || []),
		namedLoading: computed(() => source.loading()),
		// The tabs the page should RENDER: the manifest's when it declared
		// any (the strip then also drives self-authored filters), else the
		// source's own. Null when neither exists.
		namedQuickFilters: tabs,
	}
}
