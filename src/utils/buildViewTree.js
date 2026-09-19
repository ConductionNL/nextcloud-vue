/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The order two hundred saved views go on screen in.
 *
 * A flat dropdown of two hundred views is the problem the tree exists to
 * solve, so the ordering is the feature and not a detail. It is a pure
 * function for the same reason `resolveViewInheritance` is: the control should
 * render a list somebody else decided, and the decision should be testable
 * without mounting anything.
 *
 * 🔴 A CHILD WHOSE PARENT IS NOT IN THE LIST RENDERS AT THE ROOT. Its parent
 * may be shared with a group this reader is not in, or may have been deleted
 * while the dropdown was open. Dropping the child would take a person's own
 * view off their own screen because of somebody else's permissions; nesting it
 * under nothing would lose it just as thoroughly. It comes back at depth zero,
 * flagged, so the control can say where the gap is.
 *
 * 🔴 A CYCLE DOES NOT HANG THE DROPDOWN, AND DOES NOT SWALLOW ITS MEMBERS.
 * `resolveViewInheritance` refuses a cycle when a view is saved, but a control
 * renders whatever the store hands it, including rows written before that rule
 * existed. A pure cycle has no root, so walking from the roots alone would
 * emit neither of its members: two views a person saved would vanish from
 * their own dropdown with nothing on screen saying so. Every view is emitted
 * exactly once, and anything the walk did not reach comes back at the root.
 *
 * Pure: no store, no fetch, no Vue.
 */

/**
 * The group a view belongs to.
 *
 * Seeded views ship with the app and render above the user's own. The
 * separation is not cosmetic: a user may copy a seeded view but not delete it,
 * so the control has to be able to tell them apart without asking the server
 * a second time.
 *
 * @type {object}
 */
export const VIEW_GROUPS = Object.freeze({
	SEEDED: 'seeded',
	OWN: 'own',
})

/**
 * Every label in use, in the order the control should offer them.
 *
 * Labels already in use come before the option to type a new one, because a
 * label set that grows one typo at a time stops being a filter. Sorted so two
 * readers of the same views see the same order.
 *
 * @param {Array<object>} views - The views.
 * @return {Array<string>} The labels, without duplicates.
 */
export function labelsInUse(views = []) {
	const seen = new Set()
	for (const view of views) {
		for (const label of labelsOf(view)) {
			seen.add(label)
		}
	}

	return [...seen].sort((left, right) => left.localeCompare(right))
}

/**
 * The labels one view carries.
 *
 * Accepts `labels` as an array and `label` as a single string, because the
 * manifest declares one per seeded view and OpenRegister stores a list. A
 * reader should not have to know which shape a given view came from.
 *
 * @param {object} view - The view.
 * @return {Array<string>} Its labels, trimmed, without blanks.
 */
export function labelsOf(view) {
	const raw = []
	if (Array.isArray(view?.labels)) {
		raw.push(...view.labels)
	}
	if (typeof view?.label === 'string') {
		raw.push(view.label)
	}

	return raw
		.map((label) => String(label ?? '').trim())
		.filter((label) => label !== '')
}

/**
 * The views as a flat list in tree order, each carrying its depth.
 *
 * Flat rather than nested on purpose: the control renders `NcActionButton`
 * rows, which cannot nest, so a nested structure would have to be flattened
 * again at render time and the indentation would be decided in the template.
 * Here it is decided once and asserted once.
 *
 * @param {object} options - The call.
 * @param {Array<object>} options.views - Every view the reader can see.
 * @param {string} [options.labelFilter] - Show only views carrying this label.
 * @param {number} [options.maxDepth] - How deep to indent before flattening.
 *
 * @return {Array<object>} Rows of `{ view, depth, group, orphaned }`, seeded first.
 */
export function buildViewTree({ views = [], labelFilter = '', maxDepth = 3 } = {}) {
	const visible = filterByLabel(views, labelFilter)
	const bySlug = new Map()
	for (const view of visible) {
		const slug = slugOf(view)
		if (slug !== '') {
			bySlug.set(slug, view)
		}
	}

	const childrenOf = new Map()
	const roots = []
	for (const view of visible) {
		const parent = String(view?.parent ?? '').trim()
		// A parent outside the VISIBLE set, whether because it is invisible to
		// this reader or because a label filter just hid it. Either way the
		// child is still the reader's, so it comes back at the root.
		if (parent === '' || bySlug.has(parent) === false) {
			roots.push({ view, orphaned: parent !== '' })
			continue
		}
		if (childrenOf.has(parent) === false) {
			childrenOf.set(parent, [])
		}
		childrenOf.get(parent).push(view)
	}

	const rows = []
	const emitted = new Set()

	/**
	 * Emit one view and everything under it.
	 *
	 * @param {object} view - The view.
	 * @param {number} depth - Its indent level.
	 * @param {boolean} orphaned - Whether its parent is not in the list.
	 * @return {void}
	 */
	function emit(view, depth, orphaned) {
		const slug = slugOf(view)
		// Exactly once, whatever the data says. A cycle written before the
		// save-time refusal existed must not hang a dropdown.
		if (slug !== '' && emitted.has(slug) === true) {
			return
		}
		if (slug !== '') {
			emitted.add(slug)
		}

		rows.push({
			view,
			depth: Math.min(depth, maxDepth),
			group: view?.seeded === true ? VIEW_GROUPS.SEEDED : VIEW_GROUPS.OWN,
			orphaned,
		})

		for (const child of sortByName(childrenOf.get(slug) || [])) {
			emit(child, depth + 1, false)
		}
	}

	// Seeded roots first, then the reader's own, each alphabetically. A
	// dropdown whose order changes between two openings is a dropdown nobody
	// can build a habit with.
	const seededRoots = roots.filter(({ view }) => view?.seeded === true)
	const ownRoots = roots.filter(({ view }) => view?.seeded !== true)
	for (const { view, orphaned } of sortRootsByName(seededRoots)) {
		emit(view, 0, orphaned)
	}
	for (const { view, orphaned } of sortRootsByName(ownRoots)) {
		emit(view, 0, orphaned)
	}

	// 🔴 ANYTHING THE WALK DID NOT REACH, AT THE ROOT. A pure cycle has no
	// root, so walking from the roots alone emits neither of its members and
	// two views a person saved disappear from their own dropdown with nothing
	// on screen saying so. Every view arrives exactly once or the control is
	// lying about what exists.
	for (const view of sortByName(visible)) {
		emit(view, 0, true)
	}

	return rows
}

/**
 * Only the views carrying a label, when one is asked for.
 *
 * A view with no label stays reachable when no filter is active, which is the
 * half that keeps the filter optional rather than a labelling regime.
 *
 * @param {Array<object>} views - The views.
 * @param {string} labelFilter - The label, or the empty string for all.
 * @return {Array<object>} The views to render.
 */
function filterByLabel(views, labelFilter) {
	const wanted = String(labelFilter ?? '').trim()
	if (wanted === '') {
		return [...views]
	}

	return views.filter((view) => labelsOf(view).includes(wanted))
}

/**
 * A view's stable name, whatever the store called the field.
 *
 * @param {object} view - The view.
 * @return {string} Its slug, or the empty string.
 */
function slugOf(view) {
	return String(view?.slug ?? view?.id ?? '').trim()
}

/**
 * Views by name, so the order is the same on two screens.
 *
 * @param {Array<object>} views - The views.
 * @return {Array<object>} The same views, sorted.
 */
function sortByName(views) {
	return [...views].sort((left, right) => String(left?.name ?? '').localeCompare(String(right?.name ?? '')))
}

/**
 * Root entries by the name of the view they carry.
 *
 * @param {Array<object>} roots - The root entries.
 * @return {Array<object>} The same entries, sorted.
 */
function sortRootsByName(roots) {
	return [...roots].sort((left, right) => String(left.view?.name ?? '').localeCompare(String(right.view?.name ?? '')))
}
