/**
 * Build an app's effective manifest from its bundled base, its modular
 * `manifest.d/*.json` fragments (ADR-037), and its `menu-layout.json`.
 *
 * Every manifest-v2 app ran an identical ~200-line copy of this pipeline
 * inline in its `src/main.js`. Lifting it here makes the navigation contract
 * a single shared implementation: fragment merging, canonical relocations,
 * duplicate-entry removals, promotion of config entries into Nextcloud's
 * settings foldout (`section: "settings"`), and relocation of cross-app links
 * out of the navigation into the per-user settings modal's Integrations
 * section (`section: "integrations"`, ADR-110) all behave the same across the
 * fleet, and a new app adopts the whole IA model by passing its three inputs.
 *
 * The only app-local piece is collecting the fragments: `require.context` is
 * resolved by each app's own webpack build, so the caller gathers the fragment
 * objects and passes them in:
 *
 *   const ctx = require.context('./manifest.d/', false, /\.json$/)
 *   const fragments = ctx.keys().sort().map((k) => ctx(k))
 *   const manifest = buildManifest(bundledManifest, fragments, menuLayout)
 *
 * If the base (or a fragment) declares `pageTemplates[]` + `pageInstances[]`
 * (manifest-entity-scaffold-templating), the entity-scaffold expander runs as
 * the final step: each instantiation is materialised into a concrete page and
 * appended to `pages[]`, so the runtime renderer only ever sees concrete pages.
 * A manifest without templating is passed through unchanged (no-op fast path).
 *
 * @param {object} base The bundled base manifest (`src/manifest.json`).
 * @param {Array<object>} [fragments] Fragment objects (each may carry `pages`/`menu`).
 * @param {object} [menuLayout] `{ relocations?, removals?, settingsSection?, integrationsSection? }`.
 * @return {object} The merged manifest: `{ ...base, pages, menu }`.
 */

import { expandPageTemplates } from './expandPageTemplates.js'

export function buildManifest(base, fragments = [], menuLayout = {}) {
	const merged = { ...base, pages: [...(base.pages || [])], menu: [] }
	mergeMenuItems(merged.menu, base.menu || [])
	// Fragments may also carry page-template instantiations/templates/sets;
	// collect them so a fragment-authored entity scaffold expands too.
	const fragTemplates = []
	const fragInstances = []
	for (const frag of (Array.isArray(fragments) ? fragments : [])) {
		if (frag && Array.isArray(frag.pages)) {
			mergePages(merged.pages, frag.pages)
		}
		if (frag && Array.isArray(frag.menu)) {
			mergeMenuItems(merged.menu, frag.menu)
		}
		if (frag && Array.isArray(frag.pageTemplates)) fragTemplates.push(...frag.pageTemplates)
		if (frag && Array.isArray(frag.pageInstances)) fragInstances.push(...frag.pageInstances)
		if (frag && frag.sets && typeof frag.sets === 'object') {
			merged.sets = { ...(merged.sets || {}), ...frag.sets }
		}
	}
	if (fragTemplates.length) merged.pageTemplates = [...(merged.pageTemplates || []), ...fragTemplates]
	if (fragInstances.length) merged.pageInstances = [...(merged.pageInstances || []), ...fragInstances]
	merged.menu = applyMenuLayout(merged.menu, menuLayout)

	// Entity-scaffold expansion (runtime/boot path). No-op unless the manifest
	// declares pageTemplates + pageInstances. Runtime fallback semantics: a bad
	// instantiation is skipped + warned rather than blanking the whole app.
	if (Array.isArray(merged.pageTemplates) || Array.isArray(merged.pageInstances)) {
		const result = expandPageTemplates(merged, { throwOnError: false })
		if (result.errors.length) {
			// eslint-disable-next-line no-console
			console.warn('[buildManifest] page-template expansion reported errors; the offending instantiations were skipped.', result.errors)
		}
		return result.manifest
	}
	return merged
}

/**
 * Apply the canonical navigation layout (`relocations` → `removals` →
 * `settingsSection` → `integrationsSection`) to an already-merged menu.
 * Exposed separately for apps that assemble their menu through a different
 * path but still want the shared layout semantics.
 *
 * `integrationsSection` runs LAST so it wins over `settingsSection` if an id
 * is listed in both: an integration link is not a settings page of this app,
 * and the entry must end up in exactly one place. Running it last also means
 * an id lifted into the foldout by a stale `settingsSection` entry is still
 * reachable to be re-lifted, rather than silently staying in the nav.
 *
 * @param {Array<object>} menu The merged menu (mutated in place by the steps).
 * @param {object} [menuLayout] `{ relocations?, removals?, settingsSection?, integrationsSection? }`.
 * @return {Array<object>} The laid-out menu.
 */
export function applyMenuLayout(menu, menuLayout = {}) {
	let out = applyMenuRelocations(menu, menuLayout.relocations)
	out = applyMenuRemovals(out, menuLayout.removals)
	out = applySettingsSection(out, menuLayout.settingsSection)
	out = applyIntegrationsSection(out, menuLayout.integrationsSection)
	return out
}

/**
 * Merge an array of incoming menu items into a target array, keyed by `id`.
 * New ids are appended; existing ids are merged in place: the first
 * definition of each listed key wins (the base manifest loads first, so its
 * canonical group definitions take precedence), and `children` are unioned
 * recursively by the same rule. Fragments may therefore extend an existing
 * group by re-declaring only its `id` plus their own `children`.
 *
 * @param {Array<object>} target The accumulated menu (mutated in place).
 * @param {Array<object>} incoming Menu items from a fragment.
 * @return {void}
 */
export function mergeMenuItems(target, incoming) {
	incoming.forEach((item) => {
		const existing = target.find((t) => t.id === item.id)
		if (!existing) {
			target.push({ ...item, children: Array.isArray(item.children) ? [...item.children] : item.children })
			return
		}
		for (const key of ['label', 'icon', 'route', 'order', 'section', 'featureFlag', 'permission', 'visibleIf', 'href', 'action']) {
			if (existing[key] === undefined && item[key] !== undefined) {
				existing[key] = item[key]
			}
		}
		if (Array.isArray(item.children) && item.children.length > 0) {
			if (!Array.isArray(existing.children)) {
				existing.children = []
			}
			mergeMenuItems(existing.children, item.children)
		}
	})
}

/**
 * Merge fragment pages onto the accumulated page list by `id` — a later
 * declaration REPLACES an earlier one wholesale, so a fragment can overlay a
 * base page (e.g. swap a schema-driven detail for a bespoke `type: "custom"`
 * component) and guarantee one route per page id.
 *
 * @param {Array<object>} target Accumulated pages (mutated in place).
 * @param {Array<object>} incoming Pages from a fragment.
 * @return {void}
 */
export function mergePages(target, incoming) {
	incoming.forEach((page) => {
		const idx = target.findIndex((p) => p.id === page.id)
		if (idx === -1) {
			target.push(page)
		} else {
			target[idx] = page
		}
	})
}

/**
 * Re-home merged menu entries onto the canonical navigation layout declared
 * by `menu-layout.json#relocations` (`{ sourceId: targetGroupId }`).
 *
 *  - A relocated GROUP dissolves: its children merge (by id) into the target
 *    group and the now-empty shell is dropped.
 *  - A relocated LEAF (top-level or child of any group) moves under the
 *    target group.
 *  - A child group relocated onto its own parent flattens into it.
 *  - Unknown source ids are inert; a missing target keeps the entry at the
 *    top level so nothing silently disappears.
 *
 * Runs in passes until stable (children freed by a dissolved group can
 * themselves be relocated on the next pass).
 *
 * @param {Array<object>} menu The merged menu (mutated in place).
 * @param {Record<string, string>|undefined} relocations Source-id → target-group-id map.
 * @return {Array<object>} The menu with relocations applied.
 */
export function applyMenuRelocations(menu, relocations) {
	if (!relocations || typeof relocations !== 'object') return menu
	for (let pass = 0; pass < 5; pass++) {
		const moves = []
		for (let i = menu.length - 1; i >= 0; i--) {
			const node = menu[i]
			const target = relocations[node.id]
			if (target && target !== node.id) {
				menu.splice(i, 1)
				moves.push({ node, target })
				continue
			}
			if (!Array.isArray(node.children)) continue
			for (let j = node.children.length - 1; j >= 0; j--) {
				const child = node.children[j]
				const childTarget = relocations[child.id]
				if (!childTarget) continue
				if (childTarget === node.id && !Array.isArray(child.children)) continue
				node.children.splice(j, 1)
				moves.push({ node: child, target: childTarget })
			}
		}
		if (moves.length === 0) break
		moves.forEach(({ node, target }) => {
			const group = menu.find((m) => m.id === target)
			if (!group) {
				menu.push(node)
				return
			}
			if (!Array.isArray(group.children)) group.children = []
			if (Array.isArray(node.children)) {
				mergeMenuItems(group.children, node.children)
			} else {
				mergeMenuItems(group.children, [node])
			}
		})
	}
	// Drop empty group shells left behind by relocations.
	return menu.filter((m) => m.route || m.href || m.action
		|| (Array.isArray(m.children) && m.children.length > 0))
}

/**
 * Remove individual menu entries by id after relocation — used to retire
 * duplicate navigation entries whose PAGE must stay routable (deep links and
 * e2e specs hit the route directly). Declared in `menu-layout.json#removals`.
 * Only leaf entries are removed; a group is dropped only when it is explicitly
 * removed OR left empty after its children were removed/relocated away. A
 * group carrying a `route`/`href`/`action` is itself clickable (a direct-link
 * top-level item, e.g. a "Reporting & Compliance" → cards-page link) and
 * survives even when all its children are gone.
 *
 * @param {Array<object>} menu The merged menu.
 * @param {Array<string>|undefined} removals Menu-entry ids to drop.
 * @return {Array<object>} The menu without the removed entries.
 */
export function applyMenuRemovals(menu, removals) {
	if (!Array.isArray(removals) || removals.length === 0) return menu
	const drop = new Set(removals)
	const wasGroup = (n) => Array.isArray(n.children) && n.children.length > 0
	const isClickable = (n) => n.route !== undefined || n.href !== undefined || n.action !== undefined
	const prune = (nodes) => nodes.reduce((acc, n) => {
		if (drop.has(n.id) && !wasGroup(n)) return acc
		if (Array.isArray(n.children)) {
			const children = prune(n.children)
			const hadChildren = wasGroup(n)
			if (children.length === 0 && hadChildren && !isClickable(n)) return acc
			acc.push({ ...n, children })
			return acc
		}
		acc.push(n)
		return acc
	}, [])
	return prune(menu)
}

/**
 * Lift the menu entries listed by id out of wherever they currently sit, tag
 * them with `section`, flatten them (neither destination renders nested
 * groups), and append them at the top level. Empty non-clickable groups left
 * behind are dropped; a clickable group is kept.
 *
 * Shared by `applySettingsSection` and `applyIntegrationsSection` so the two
 * destinations cannot drift in their lift semantics — the only difference
 * between them is the section tag, and therefore which surface renders them.
 *
 * @param {Array<object>} menu The merged + relocated + pruned menu.
 * @param {Array<string>|undefined} ids Entry ids to lift.
 * @param {string} section The `section` tag to stamp on each lifted entry.
 * @return {Array<object>} The menu with the listed entries lifted out.
 */
function liftToSection(menu, ids, section) {
	if (!Array.isArray(ids) || ids.length === 0) return menu
	const want = new Set(ids)
	const isClickable = (n) => n.route !== undefined || n.href !== undefined || n.action !== undefined
	const lifted = []
	const strip = (nodes) => nodes.reduce((acc, n) => {
		if (want.has(n.id)) {
			const { children, ...leaf } = n
			lifted.push({ ...leaf, section })
			return acc
		}
		if (Array.isArray(n.children)) {
			const children = strip(n.children)
			if (children.length === 0 && n.children.length > 0 && !isClickable(n)) return acc
			acc.push({ ...n, children })
			return acc
		}
		acc.push(n)
		return acc
	}, [])
	const remaining = strip(menu)
	return [...remaining, ...lifted]
}

/**
 * Promote the menu entries listed in `menu-layout.json#settingsSection` into
 * Nextcloud's settings foldout — the `NcAppNavigationSettings` gear at the
 * bottom-left of the navigation, OUTSIDE the scrollable list. CnAppNav renders
 * every TOP-LEVEL item carrying `section: "settings"` as a flat entry inside
 * that foldout (with an auto-prepended "Personal settings").
 *
 * @param {Array<object>} menu The merged + relocated + pruned menu.
 * @param {Array<string>|undefined} settingsIds Entry ids to move to the foldout.
 * @return {Array<object>} The menu with the settings entries lifted out.
 */
export function applySettingsSection(menu, settingsIds) {
	return liftToSection(menu, settingsIds, 'settings')
}

/**
 * Move the menu entries listed in `menu-layout.json#integrationsSection` OUT of
 * the navigation entirely and into the Integrations section at the bottom of
 * the per-user settings modal (ADR-110).
 *
 * This is where a link that LEAVES this app for another one belongs. Such a
 * link is not a page of this app — it cannot be active, it has no counter, and
 * putting it in the nav makes another app's capability read as this app's
 * feature. The one deep link that stays in the navigation is Admin settings,
 * and CnAppNav auto-prepends that itself (ADR-079); no app declares it.
 *
 * The entry survives — it is relocated, never dropped — which is what keeps
 * this compatible with the ADR-044 Decision 5 no-functionality-loss invariant.
 *
 * @param {Array<object>} menu The merged + relocated + pruned menu.
 * @param {Array<string>|undefined} integrationIds Entry ids to move to Integrations.
 * @return {Array<object>} The menu with the integration entries lifted out.
 */
export function applyIntegrationsSection(menu, integrationIds) {
	return liftToSection(menu, integrationIds, 'integrations')
}
