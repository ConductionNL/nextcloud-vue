/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * commandPaletteObjectSource — the "objects" source adapter for
 * `CnCommandPalette`: live search over OpenRegister via the SAME
 * `useObjectStore().fetchCollection(type, { _search, _limit })` call
 * `CnIndexPage` / `CnSearchPage` consumers already wire up (see
 * `src/store/useObjectStore.js` `fetchCollection`) — no new backend
 * mechanism, just a debounce/cancel/aggregate wrapper the palette needs
 * that a single `fetchCollection` call doesn't provide on its own.
 *
 * Deliberately store-agnostic beyond the `fetchCollection(type, params)`
 * contract: `CnCommandPalette` itself never imports `useObjectStore`, so
 * this factory is the ONLY place that couples the palette to the object
 * store, and it's opt-in (an app wires it into the palette's `objectSearch`
 * prop, or leaves objects out of the palette entirely).
 *
 * "Cancellable" here means stale-result discarding, not `AbortController`
 * network cancellation — `fetchCollection` doesn't accept a signal. A
 * monotonic call token ensures a slow, superseded search's response is
 * thrown away instead of overwriting a newer query's results, which is
 * what actually matters for "never blocking the palette": the in-flight
 * network request may finish late, but its answer never reaches the UI.
 *
 * @module utils/commandPaletteObjectSource
 */

/**
 * Resolve a manifest `type: 'detail'` page's route for one object, using
 * the SAME `pages[].config.register` / `pages[].config.schema` matching and
 * the single `:param` dynamic-segment convention every existing detail page
 * already follows (see `tests/cli/transforms/liftSidebarTabWidgets.test.js`
 * fixtures — `route: '/detail/:id'`). A ready-made building block for
 * `resolveResult`'s `route`, so an app with a conventional manifest-driven
 * detail page needs a one-line `resolveResult` instead of writing its own
 * route lookup.
 *
 * @param {Array<object>} pages `manifest.pages` (or an equivalent array of `TManifestPage`).
 * @param {object} target The object to resolve a route for.
 * @param {string} target.register Register slug the object belongs to.
 * @param {string} target.schema Schema slug the object belongs to.
 * @param {string|number} target.id The object's id (or uuid).
 * @return {?{path: string}} A vue-router location, or `null` when no matching detail page exists.
 */
export function resolveManifestDetailRoute(pages, { register, schema, id } = {}) {
	if (!Array.isArray(pages) || id === undefined || id === null || id === '') return null
	const page = pages.find((p) => p
		&& p.type === 'detail'
		&& p.config
		&& p.config.register === register
		&& p.config.schema === schema
		&& typeof p.route === 'string')
	if (!page) return null
	const path = page.route.replace(/:[^/]+/, encodeURIComponent(String(id)))
	return { path }
}

/**
 * Default `resolveResult` — used when the caller doesn't supply one. Reads
 * the common title-ish fields OpenRegister objects carry (`title`, `name`,
 * `label`, or the `@self.name` display-name projection) and falls back to
 * the bare id so a candidate is never silently dropped for lacking a title
 * field the caller didn't anticipate.
 *
 * @param {object} obj The raw OpenRegister object.
 * @param {string} type The registered type slug it came from.
 * @return {{title: string, subtitle: string}} The resolved display fields.
 */
function defaultResolveResult(obj, type) {
	const self = obj && obj['@self']
	const title = (obj && (obj.title || obj.name || obj.label))
		|| (self && self.name)
		|| String((obj && (obj.id ?? obj.uuid)) ?? '')
	return { title, subtitle: type }
}

/**
 * Create an "objects" source for `CnCommandPalette`'s `objectSearch` prop:
 * an `async (query) => resultItems[]` function that fans a query out to
 * `store.fetchCollection(type, { _search, _limit })` for every configured
 * type, in parallel, discarding stale responses.
 *
 * @param {object} config Source configuration.
 * @param {object} config.store A `useObjectStore()` instance (or anything exposing `fetchCollection(type, params)`).
 * @param {string[]} config.types Registered type slugs to search (as passed to `store.registerObjectType` / `fetchCollection`).
 * @param {string} [config.section] Section label the palette groups these results under. Defaults to `'Objects'`.
 * @param {number} [config.limit] Max results requested PER type (not total). Defaults to `6`.
 * @param {number} [config.minQueryLength] Below this query length, `search()` resolves to `[]` without calling the store (avoids a network round-trip per keystroke on a 1-character query). Defaults to `2`.
 * @param {?Function} [config.resolveResult] `(obj, type) => { title, subtitle?, keywords?, route?, run? }`. Defaults to `defaultResolveResult` (title-ish field sniffing, no navigation). Supply this to wire real navigation — e.g. via `resolveManifestDetailRoute`.
 * @param {?object} [config.router] A vue-router instance. When `resolveResult` returns `route` (and not `run`), the item's `run()` calls `router.push(route)`. Omit if every `resolveResult` returns its own `run`.
 * @return {{id: string, section: string, search: (query: string) => Promise<Array<object>>}} The source descriptor for `CnCommandPalette`'s `objectSearch` prop.
 */
export function createObjectSearchSource(config = {}) {
	const { store, types, section = 'Objects', limit = 6, minQueryLength = 2, resolveResult, router = null } = config

	if (!store || typeof store.fetchCollection !== 'function') {
		throw new TypeError('[commandPalette] createObjectSearchSource requires a `store` exposing fetchCollection(type, params)')
	}

	const typeList = Array.isArray(types) ? types.filter((t) => typeof t === 'string' && t !== '') : []
	let latestToken = 0

	/**
	 * @param {string} query The raw query text.
	 * @return {Promise<Array<object>>} Ranked-input-shaped result items (`{id, title, section, keywords, run}`).
	 */
	async function search(query) {
		const trimmed = typeof query === 'string' ? query.trim() : ''
		const token = ++latestToken

		if (trimmed.length < minQueryLength || typeList.length === 0) {
			return []
		}

		const settled = await Promise.allSettled(
			typeList.map((type) => store.fetchCollection(type, { _search: trimmed, _limit: limit })),
		)

		// A newer call to search() superseded this one while we awaited —
		// discard our (now stale) answer instead of racing it into the UI.
		if (token !== latestToken) {
			return []
		}

		const items = []
		settled.forEach((outcome, i) => {
			if (outcome.status !== 'fulfilled' || !Array.isArray(outcome.value)) return
			const type = typeList[i]
			for (const obj of outcome.value) {
				const resolved = typeof resolveResult === 'function'
					? resolveResult(obj, type)
					: defaultResolveResult(obj, type)
				if (!resolved || !resolved.title) continue

				let run = typeof resolved.run === 'function' ? resolved.run : null
				if (!run && resolved.route && router && typeof router.push === 'function') {
					run = () => router.push(resolved.route)
				}
				if (!run) {
					// eslint-disable-next-line no-console
					run = () => console.warn(`[commandPalette] object result "${resolved.title}" has no \`run\`/\`route\` — pass \`resolveResult\` (and/or \`router\`) to createObjectSearchSource to wire navigation.`)
				}

				items.push({
					id: `objects:${type}:${obj && (obj.id ?? obj.uuid) !== undefined ? (obj.id ?? obj.uuid) : items.length}`,
					title: resolved.title,
					subtitle: resolved.subtitle || type,
					section,
					keywords: Array.isArray(resolved.keywords) ? resolved.keywords : [],
					run,
				})
			}
		})
		return items
	}

	return { id: 'objects', section, search }
}
