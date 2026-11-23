/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The one name a saved view is called by from everywhere else.
 *
 * A dashboard widget, an export action and an API caller should name a view
 * rather than restate its query. Restating it is how four surfaces end up
 * showing four slightly different answers to "open cases" and nobody can say
 * which is the real one.
 *
 * 🔴 AN UNKNOWN SLUG IS AN EMPTY STATE THAT SAYS THE NAME, NEVER A BLANK LIST.
 * A widget citing a view somebody has since renamed is the ordinary way this
 * goes wrong, and a blank list is indistinguishable from a query that matched
 * nothing. One of those is a configuration to fix and the other is a quiet
 * morning; the reader has to be able to tell.
 *
 * 🔴 A SLUG IS EDITABLE ONLY WHILE NOTHING CITES IT. Renaming a slug something
 * points at does not break loudly: the citing surface simply stops finding the
 * view, and keeps rendering. So the rename is refused while a citation exists,
 * and the refusal names what is citing it, because "in use" without a name is
 * a dead end for whoever has to go and change it.
 *
 * Pure: no store, no fetch, no Vue.
 */

/** A slug is a path segment: lowercase, digits and dashes. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/**
 * Why a slug could not be taken or changed.
 *
 * @type {object}
 */
export const SLUG_ERRORS = Object.freeze({
	MALFORMED: 'view-slug-malformed',
	TAKEN: 'view-slug-taken',
	CITED: 'view-slug-cited',
})

/**
 * Whether a string is a well-formed slug.
 *
 * @param {string} slug - The candidate.
 * @return {boolean} True when it is a path segment.
 */
export function isWellFormedSlug(slug) {
	return SLUG_PATTERN.test(String(slug ?? ''))
}

/**
 * The view a slug names.
 *
 * @param {string} slug - The slug cited.
 * @param {Array<object>} views - The views the reader can see.
 * @return {object|null} The view, or null when nothing answers to the name.
 */
export function findViewBySlug(slug, views = []) {
	const wanted = String(slug ?? '').trim()
	if (wanted === '') {
		return null
	}

	return views.find((view) => String(view?.slug ?? '').trim() === wanted) || null
}

/**
 * What a surface citing a slug should render.
 *
 * Returns the view when it resolves, and otherwise an empty state carrying the
 * slug, so the surface can say "no view called open-cases" rather than draw an
 * empty table. The distinction is the whole point of this function existing
 * rather than callers using `findViewBySlug` directly.
 *
 * @param {string} slug - The slug cited.
 * @param {Array<object>} views - The views the reader can see.
 * @return {{view: ?object, missingSlug: string}} The view, or the name that failed.
 */
export function resolveCitedView(slug, views = []) {
	const view = findViewBySlug(slug, views)
	if (view) {
		return { view, missingSlug: '' }
	}

	return { view: null, missingSlug: String(slug ?? '').trim() }
}

/**
 * Whether a view may take a slug, and why not when it may not.
 *
 * @param {object} options - The call.
 * @param {string} options.slug - The slug wanted.
 * @param {string} [options.viewId] - The view taking it, so it does not
 *   collide with itself when its other fields are saved.
 * @param {Array<object>} [options.views] - Every view, to find a holder.
 *
 * @return {{ok: boolean, error: ?object}} The verdict, with the holder named.
 */
export function claimSlug({ slug, viewId = '', views = [] } = {}) {
	const wanted = String(slug ?? '').trim()

	if (isWellFormedSlug(wanted) === false) {
		return {
			ok: false,
			error: { code: SLUG_ERRORS.MALFORMED, slug: wanted },
		}
	}

	const holder = views.find((view) => String(view?.slug ?? '').trim() === wanted
		&& String(view?.id ?? '') !== String(viewId))
	if (holder) {
		return {
			ok: false,
			// The holder BY NAME. "That slug is taken" leaves somebody
			// hunting through two hundred views for the one that has it.
			error: { code: SLUG_ERRORS.TAKEN, slug: wanted, holder: holder.name || holder.id },
		}
	}

	return { ok: true, error: null }
}

/**
 * Whether a view's slug may be changed.
 *
 * @param {object} options - The call.
 * @param {object} options.view - The view whose slug is being edited.
 * @param {Array<object>} [options.citations] - What cites slugs, each
 *   `{ slug, by }`: the slug cited and a human name for the citer.
 *
 * @return {{ok: boolean, error: ?object}} The verdict, with the citers named.
 */
export function canEditSlug({ view, citations = [] } = {}) {
	const slug = String(view?.slug ?? '').trim()
	if (slug === '') {
		// Nothing can cite a view that has no name yet, so naming it for the
		// first time is always allowed.
		return { ok: true, error: null }
	}

	const citers = citations
		.filter((citation) => String(citation?.slug ?? '').trim() === slug)
		.map((citation) => String(citation?.by ?? '').trim())
		.filter((by) => by !== '')

	if (citers.length === 0) {
		return { ok: true, error: null }
	}

	return {
		ok: false,
		error: { code: SLUG_ERRORS.CITED, slug, citedBy: citers },
	}
}
