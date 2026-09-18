/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What a saved view actually shows, once its parents have had their say.
 *
 * A saved view may hang under another one and take parts of it. FIVE PARTS,
 * RESOLVED SEPARATELY, and that separation is the whole design rather than an
 * implementation detail: "Vergunningen, in behandeling" is the parent's six
 * columns and sort order with one narrower filter, and a resolver that
 * inherited all-or-nothing would make that view impossible to express. It is
 * the shape osTicket arrived at too, with FLAG_INHERIT_CRITERIA, _COLUMNS,
 * _SORTING, _DEF_SORT and _EXPORT as five independent flags.
 *
 * 🔴 A CYCLE IS REFUSED, NOT SURVIVED. A view whose parent is one of its own
 * descendants is a walk with no end. Returning something plausible here would
 * hand the list a resolved view that nobody can account for; the caller is
 * told, with both names in the message, because "something went wrong" does
 * not tell an administrator which two views to go and look at.
 *
 * 🔴 A MISSING PARENT IS NOT AN ERROR. A view shared with a group the reader
 * is not in simply does not arrive, and the child still has to render. It
 * resolves against what it has, keeps its own parts, and reports which parts
 * it could not resolve so the control can say so on screen. Refusing here
 * would take a person's own view away from them because of somebody else's
 * permissions.
 *
 * Pure: no store, no fetch, no Vue. Every input is passed in.
 */

/**
 * The parts a child may take from its parent, in the order a reader meets
 * them: what is listed, what is shown of it, how it is ordered, where it
 * opens, and what comes out of an export.
 *
 * @type {string[]}
 */
export const INHERITABLE_PARTS = Object.freeze([
	'criteria',
	'columns',
	'sorting',
	'defaultSort',
	'exportFields',
])

/**
 * The default depth bound, matching `savedViewTree.maxDepth` in the manifest
 * schema. Stated once so the resolver and the validator cannot drift.
 *
 * @type {number}
 */
export const DEFAULT_MAX_DEPTH = 3

/**
 * Why a resolution could not be completed.
 *
 * Named codes rather than free text, because a caller has to tell a cycle
 * (an administrator fixes it) from a chain that is merely too deep (an
 * administrator flattens it) from a parent that is invisible (nobody did
 * anything wrong).
 *
 * @type {object}
 */
export const RESOLUTION_ERRORS = Object.freeze({
	CYCLE: 'view-parent-cycle',
	TOO_DEEP: 'view-chain-too-deep',
})

/**
 * Whether a view asks to inherit one part.
 *
 * An absent `inherits` on a view WITH a parent means every part, which is the
 * reading that makes the common case short: most children exist to narrow one
 * thing. An explicit empty array means none, so a child can hang under a
 * parent for grouping alone without taking anything from it.
 *
 * @param {object} view - The view.
 * @param {string} part - One of INHERITABLE_PARTS.
 * @return {boolean} True when the view takes that part from its parent.
 */
export function inheritsPart(view, part) {
	if (!view || !view.parent) {
		return false
	}
	if (!Array.isArray(view.inherits)) {
		return true
	}
	return view.inherits.includes(part)
}

/**
 * The chain from a view up to its root, nearest first.
 *
 * @param {string} slug - The view to start from.
 * @param {Map<string, object>} bySlug - Every view the reader can see.
 * @param {number} maxDepth - The declared bound.
 * @return {{chain: Array<object>, error: ?object}} The chain, or the refusal.
 */
function walkUp(slug, bySlug, maxDepth) {
	const chain = []
	const seen = new Set()
	let current = bySlug.get(slug)

	while (current) {
		if (seen.has(current.slug)) {
			return {
				chain,
				error: {
					code: RESOLUTION_ERRORS.CYCLE,
					// BOTH names, because one of them is the view somebody
					// edited and the other is the one they have to look at to
					// understand why it was refused.
					views: [slug, current.slug],
				},
			}
		}
		seen.add(current.slug)
		chain.push(current)

		if (!current.parent) {
			break
		}
		// The bound counts ANCESTORS, so maxDepth 3 permits a view with three
		// parents above it. Counted on the chain rather than on a separate
		// tally so the two cannot disagree.
		if (chain.length > maxDepth) {
			return {
				chain,
				error: { code: RESOLUTION_ERRORS.TOO_DEEP, views: [slug] },
			}
		}
		current = bySlug.get(current.parent)
	}

	return { chain, error: null }
}

/**
 * Resolve one view against the views around it.
 *
 * @param {object} options - The call.
 * @param {string} options.slug - The view to resolve.
 * @param {Array<object>} options.views - Every view the reader can see.
 * @param {number} [options.maxDepth] - The declared bound.
 *
 * @return {object} `{ view, resolved, unresolvedParts, missingParent, error }`.
 *   `resolved` carries the five parts as they will be used. `error` is null on
 *   success and a named refusal otherwise, and on a refusal `resolved` is the
 *   view's OWN parts rather than a half-walked mixture: a partly-inherited
 *   view is the one answer nobody could reason about.
 */
export function resolveViewInheritance({ slug, views = [], maxDepth = DEFAULT_MAX_DEPTH } = {}) {
	const bySlug = new Map()
	for (const view of views) {
		if (view && typeof view.slug === 'string' && view.slug !== '') {
			bySlug.set(view.slug, view)
		}
	}

	const view = bySlug.get(slug) || null
	if (!view) {
		return {
			view: null,
			resolved: {},
			unresolvedParts: [],
			missingParent: false,
			error: null,
		}
	}

	const own = ownParts(view)
	const { chain, error } = walkUp(slug, bySlug, maxDepth)
	if (error) {
		return {
			view,
			resolved: own,
			unresolvedParts: [],
			missingParent: false,
			error,
		}
	}

	// A parent named and not present: shared with a group this reader is not
	// in. Not an error; the child renders at the root with the parts it could
	// not take listed, so the control can say where the gap is.
	const deepest = chain[chain.length - 1]
	const missingParent = Boolean(deepest.parent) && !bySlug.has(deepest.parent)

	const resolved = {}
	const unresolvedParts = []
	for (const part of INHERITABLE_PARTS) {
		const found = resolvePart(part, chain)
		if (found.found) {
			resolved[part] = found.value
			continue
		}
		if (inheritsPart(view, part) === true) {
			unresolvedParts.push(part)
		}
	}

	return { view, resolved, unresolvedParts, missingParent, error: null }
}

/**
 * One part, walked up the chain until a view declares it.
 *
 * The nearest declaration wins, and the walk stops at the first view that
 * neither declares the part nor asks to inherit it. That view is the answer:
 * it OVERRODE the part and left it empty, which is a real thing to want (a
 * triage child with no export field set at all) and is not the same as
 * inheriting its parent's.
 *
 * A view that declares a part and also lists it in `inherits` is a
 * contradiction. The declaration wins, because it is the more specific of the
 * two and because the manifest validator already refuses the shape where it
 * matters; a runtime view that arrives this way gets the value somebody typed
 * rather than a silent parent's.
 *
 * @param {string} part - One of INHERITABLE_PARTS.
 * @param {Array<object>} chain - The chain, nearest first.
 * @return {{found: boolean, value: (object|Array|string|undefined)}} The value, when some view has one.
 */
function resolvePart(part, chain) {
	for (const view of chain) {
		if (view && view[part] !== undefined && view[part] !== null) {
			return { found: true, value: view[part] }
		}
		if (inheritsPart(view, part) === false) {
			break
		}
	}

	return { found: false, value: undefined }
}

/**
 * A view's own declared parts, ignoring its parents.
 *
 * @param {object} view - The view.
 * @return {object} The parts it declares itself.
 */
function ownParts(view) {
	const own = {}
	for (const part of INHERITABLE_PARTS) {
		if (view[part] !== undefined && view[part] !== null) {
			own[part] = view[part]
		}
	}
	return own
}
