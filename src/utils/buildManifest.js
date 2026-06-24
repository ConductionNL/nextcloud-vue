/**
 * Build an app's effective manifest from its bundled base, its modular
 * `manifest.d/*.json` fragments (ADR-037), and its `menu-layout.json`.
 *
 * Every manifest-v2 app ran an identical ~200-line copy of this pipeline
 * inline in its `src/main.js`. Lifting it here makes the navigation contract
 * a single shared implementation: fragment merging, canonical relocations,
 * duplicate-entry removals, and promotion of config entries into Nextcloud's
 * settings foldout (`section: "settings"`) all behave the same across the
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
 * @param {object} base The bundled base manifest (`src/manifest.json`).
 * @param {Array<object>} [fragments] Fragment objects (each may carry `pages`/`menu`).
 * @param {object} [menuLayout] `{ relocations?, removals?, settingsSection? }`.
 * @return {object} The merged manifest: `{ ...base, pages, menu }`.
 */
export function buildManifest(base, fragments = [], menuLayout = {}) {
	const merged = { ...base, pages: [...(base.pages || [])], menu: [] }
	mergeMenuItems(merged.menu, base.menu || [])
	for (const frag of (Array.isArray(fragments) ? fragments : [])) {
		if (frag && Array.isArray(frag.pages)) {
			mergePages(merged.pages, frag.pages)
		}
		if (frag && Array.isArray(frag.menu)) {
			mergeMenuItems(merged.menu, frag.menu)
		}
	}
	merged.menu = applyMenuLayout(merged.menu, menuLayout)
	return merged
}

/**
 * Apply the canonical navigation layout (`relocations` → `removals` →
 * `settingsSection`) to an already-merged menu. Exposed separately for apps
 * that assemble their menu through a different path but still want the shared
 * layout semantics.
 *
 * @param {Array<object>} menu The merged menu (mutated in place by the steps).
 * @param {object} [menuLayout] `{ relocations?, removals?, settingsSection? }`.
 * @return {Array<object>} The laid-out menu.
 */
export function applyMenuLayout(menu, menuLayout = {}) {
	let out = applyMenuRelocations(menu, menuLayout.relocations)
	out = applyMenuRemovals(out, menuLayout.removals)
	out = applySettingsSection(out, menuLayout.settingsSection)
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
 * Promote the menu entries listed in `menu-layout.json#settingsSection` into
 * Nextcloud's settings foldout — the `NcAppNavigationSettings` gear at the
 * bottom-left of the navigation, OUTSIDE the scrollable list. CnAppNav renders
 * every TOP-LEVEL item carrying `section: "settings"` as a flat entry inside
 * that foldout (with an auto-prepended "Personal settings"). This lifts each
 * listed id out of wherever it currently sits, tags it `section: "settings"`,
 * flattens it (the foldout has no nested groups), and appends it to the top
 * level. Empty non-clickable groups left behind are dropped; a clickable group
 * is kept.
 *
 * @param {Array<object>} menu The merged + relocated + pruned menu.
 * @param {Array<string>|undefined} settingsIds Entry ids to move to the foldout.
 * @return {Array<object>} The menu with the settings entries lifted out.
 */
export function applySettingsSection(menu, settingsIds) {
	if (!Array.isArray(settingsIds) || settingsIds.length === 0) return menu
	const want = new Set(settingsIds)
	const isClickable = (n) => n.route !== undefined || n.href !== undefined || n.action !== undefined
	const lifted = []
	const strip = (nodes) => nodes.reduce((acc, n) => {
		if (want.has(n.id)) {
			const { children, ...leaf } = n
			lifted.push({ ...leaf, section: 'settings' })
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
