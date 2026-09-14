/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useListNavigation: step to the next record in the list you came from.
 *
 * A handler working a queue of forty opens the fourth case, reads it, and
 * wants the fifth. Today that is back, find your place, click. This gives
 * the detail page the list, its filter and its sort, so next and previous
 * mean what the handler saw rather than what the API happens to return.
 *
 * Three properties hold it honest, and each is a way this has been got wrong
 * elsewhere:
 *
 *   - The context comes from the ROUTE, so a reload keeps it.
 *   - A record opened WITHOUT context offers no next and no previous, rather
 *     than inferring an order from an unfiltered fetch.
 *   - The first and the last record say so rather than wrapping.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 * @module composables/useListNavigation
 */

import { computed, isRef, ref, unref, watch } from 'vue'
import { rowIdOf } from '../components/CnIndexPage/splitView.js'
import { listContextFromRoute, listContextToParams, listContextToQuery, neighboursOf } from '../utils/listNavigation.js'

/**
 * Give a detail view next and previous within the list it was opened from.
 *
 * @param {object} options Options.
 * @param {object|import('vue').Ref<object>} options.route The current route (`$route`).
 * @param {object} [options.router] The router. Without one, `goNext` and `goPrevious` resolve the id and do not navigate.
 * @param {string|import('vue').Ref<string>} options.currentId The record open now.
 * @param {string} [options.objectType] Object type slug, for the default fetcher.
 * @param {object} [options.objectStore] An object store instance, for the default fetcher.
 * @param {(params: object) => Promise<Array<object|string>>} [options.fetchList] Fetch the list this record came from. Receives API params; returns records or ids. Overrides the store fetcher.
 * @param {string} [options.rowKey] Field a record's id is read from.
 * @param {number} [options.limit] How many records of the list to hold.
 * @return {object} Reactive navigation state and two navigate functions.
 *
 * @example
 * const nav = useListNavigation({
 *   route: useRoute(),
 *   router: useRouter(),
 *   currentId: toRef(props, 'objectId'),
 *   objectType: 'case',
 * })
 * // nav.available.value → false on a link with no list context
 * // nav.goNext()        → opens the next case of that same filtered list
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */
export function useListNavigation(options = {}) {
	const {
		route,
		router = null,
		currentId,
		objectType = '',
		objectStore = null,
		fetchList = null,
		rowKey = 'id',
		limit = 200,
	} = options

	const ids = ref([])
	const loading = ref(false)
	const failed = ref(false)

	const currentRoute = computed(() => unref(route) || null)
	const currentRecordId = computed(() => {
		const id = isRef(currentId) ? currentId.value : currentId
		return id === undefined || id === null || id === '' ? null : String(id)
	})

	/**
	 * The list this record was opened from, or null when the address names
	 * none.
	 *
	 * @return {object|null} The context.
	 */
	const context = computed(() => listContextFromRoute(currentRoute.value))

	/**
	 * Where this record sits in that list.
	 *
	 * @return {object} The neighbours.
	 */
	const neighbours = computed(() => neighboursOf(ids.value, currentRecordId.value))

	/**
	 * Whether to offer next and previous at all.
	 *
	 * False on a bare link, false while the list is still loading, and false
	 * when the record turns out not to be in the list. Each of those is a
	 * case where a next button would step somewhere the handler did not ask
	 * for.
	 *
	 * @return {boolean} Whether the controls should render.
	 */
	const available = computed(() => context.value !== null && !failed.value && neighbours.value.known)

	/**
	 * Load the ids of the list this record came from.
	 *
	 * @return {Promise<void>}
	 */
	async function load() {
		const ctx = context.value
		if (!ctx) {
			ids.value = []
			failed.value = false
			return
		}
		const fetcher = resolveFetcher()
		if (!fetcher) {
			ids.value = []
			failed.value = true
			return
		}

		loading.value = true
		failed.value = false
		try {
			const rows = await fetcher(listContextToParams(ctx, limit))
			ids.value = (Array.isArray(rows) ? rows : [])
				.map((row) => (typeof row === 'string' || typeof row === 'number' ? String(row) : rowIdOf(row, rowKey)))
				.filter((id) => id !== null)
		} catch {
			// A list that could not be read offers no next and no previous.
			// Offering them over an empty list would put the handler on
			// "1 of 0" and step them nowhere.
			ids.value = []
			failed.value = true
		} finally {
			loading.value = false
		}
	}

	/**
	 * The function that loads the list, from the options or the store.
	 *
	 * @return {((params: object) => Promise<Array>)|null} The fetcher, or null when there is none.
	 */
	function resolveFetcher() {
		if (typeof fetchList === 'function') {
			return fetchList
		}
		if (objectStore && objectType && typeof objectStore.fetchCollection === 'function') {
			return async (params) => {
				await objectStore.fetchCollection(objectType, params)
				return objectStore.collections?.[objectType] || []
			}
		}
		return null
	}

	/**
	 * Open a record, keeping the list context so the next step still works.
	 *
	 * @param {string|null} id The record to open.
	 * @return {string|null} The id opened, or null when there was none.
	 */
	function open(id) {
		if (id === null || id === undefined) {
			return null
		}
		const from = currentRoute.value
		if (router && from) {
			router.push({
				name: from.name,
				params: { ...from.params, id, ...(from.params?.objectId !== undefined ? { objectId: id } : {}) },
				query: { ...from.query },
			}).catch(() => {})
		}
		return String(id)
	}

	/**
	 * Open the next record of the list. A no-op on the last one.
	 *
	 * @return {string|null} The id opened, or null at the end of the list.
	 */
	function goNext() {
		return open(neighbours.value.nextId)
	}

	/**
	 * Open the previous record of the list. A no-op on the first one.
	 *
	 * @return {string|null} The id opened, or null at the start of the list.
	 */
	function goPrevious() {
		return open(neighbours.value.previousId)
	}

	// Reload when the list the address names changes, never when only the
	// record does: stepping through a list must not refetch it at every step.
	watch(
		() => JSON.stringify(context.value),
		() => { load() },
		{ immediate: true },
	)

	return {
		context,
		ids,
		loading,
		failed,
		available,
		neighbours,
		position: computed(() => neighbours.value.position),
		total: computed(() => neighbours.value.total),
		isFirst: computed(() => neighbours.value.isFirst),
		isLast: computed(() => neighbours.value.isLast),
		hasNext: computed(() => neighbours.value.nextId !== null),
		hasPrevious: computed(() => neighbours.value.previousId !== null),
		goNext,
		goPrevious,
		refresh: load,
	}
}

export { listContextToQuery }
