/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Which view a person lands on, which columns they land with, and what a new
 * view starts from.
 *
 * Three questions the host answers and the person overrules. The order is the
 * whole rule and it is the same each time: WHAT THIS PERSON CHOSE WINS, and
 * what the administrator declared is where they start. An administered default
 * that overrode a personal choice would move somebody's list out from under
 * them every morning; a personal choice with no way back would strand anybody
 * who set one once and forgot.
 *
 * 🔴 A LANDING VIEW CHANGING MID-SESSION APPLIES ON THE NEXT ARRIVAL, NEVER BY
 * MOVING THE READER. An administrator editing a role's default while somebody
 * is reading a list must not reload that list under them. `resolveLandingView`
 * is asked on arrival and nowhere else, and that is a rule about WHERE it is
 * called from rather than something the function can enforce, so it is written
 * here for whoever wires it up.
 *
 * Pure: no store, no fetch, no Vue.
 */

/**
 * Where a resolved value came from, so a surface can offer the way back.
 *
 * A Reset control that appears whether or not there is anything to reset to is
 * a control nobody trusts, so the caller has to be able to tell a personal
 * choice from an inherited default.
 *
 * @type {object}
 */
export const VALUE_SOURCES = Object.freeze({
	PERSONAL: 'personal',
	ADMINISTERED: 'administered',
	FALLBACK: 'fallback',
})

/**
 * The view a person opens this page on.
 *
 * @param {object} options - The call.
 * @param {string} [options.personalSlug] - What this person last chose.
 * @param {object} [options.administered] - `{ [role]: slug }` from the host.
 * @param {Array<string>} [options.roles] - The roles this person holds.
 * @param {Array<object>} [options.views] - The views they can see, to check
 *   the answer still exists.
 *
 * @return {{slug: string, source: string}} The view, and where it came from.
 */
export function resolveLandingView({
	personalSlug = '',
	administered = {},
	roles = [],
	views = [],
} = {}) {
	const exists = (slug) => views.some((view) => String(view?.slug ?? '') === slug)

	const personal = String(personalSlug ?? '').trim()
	// A personal choice that no longer resolves is a view somebody deleted.
	// Falling through to the administered default is right; keeping it would
	// land the person on an empty state for ever with no way to notice.
	if (personal !== '' && exists(personal) === true) {
		return { slug: personal, source: VALUE_SOURCES.PERSONAL }
	}

	for (const role of roles) {
		const slug = String(administered?.[role] ?? '').trim()
		if (slug !== '' && exists(slug) === true) {
			return { slug, source: VALUE_SOURCES.ADMINISTERED }
		}
	}

	return { slug: '', source: VALUE_SOURCES.FALLBACK }
}

/**
 * The columns a person sees.
 *
 * NARROWS `index-columns-per-scope` RATHER THAN REPLACING IT. The scope's
 * columns are the set that exists on this page; a role's columns choose among
 * them. A role naming a column the scope does not offer gets nothing extra,
 * because a per-role list that could ADD a column would be a second, quieter
 * way to put a field on screen that the scope had deliberately left off.
 *
 * @param {object} options - The call.
 * @param {Array<string>} [options.personal] - What this person chose.
 * @param {object} [options.administered] - `{ [role]: string[] }` from the host.
 * @param {Array<string>} [options.roles] - The roles this person holds.
 * @param {Array<string>} [options.scopeColumns] - What the scope offers.
 *
 * @return {{columns: Array<string>, source: string}} The columns, and where from.
 */
export function resolveColumns({
	personal = null,
	administered = {},
	roles = [],
	scopeColumns = [],
} = {}) {
	const withinScope = (columns) => columns.filter((column) => scopeColumns.length === 0 || scopeColumns.includes(column))

	if (Array.isArray(personal) === true && personal.length > 0) {
		return { columns: withinScope(personal), source: VALUE_SOURCES.PERSONAL }
	}

	for (const role of roles) {
		const declared = administered?.[role]
		if (Array.isArray(declared) === true && declared.length > 0) {
			return { columns: withinScope(declared), source: VALUE_SOURCES.ADMINISTERED }
		}
	}

	return { columns: [...scopeColumns], source: VALUE_SOURCES.FALLBACK }
}

/**
 * What a new view starts from.
 *
 * A template presets the columns, the sort and the export field set, and the
 * person may change each. NO TEMPLATE DECLARED MEANS TODAY'S BEHAVIOUR: the
 * new view is the list as it stands, which is what Save current view has
 * always meant and what anybody who has used it expects.
 *
 * @param {object} options - The call.
 * @param {string} [options.templateSlug] - The template chosen, if any.
 * @param {Array<object>} [options.templates] - What the host declared.
 * @param {object} [options.currentState] - The list as it stands.
 *
 * @return {object} The state the new view starts with.
 */
export function startingStateForNewView({
	templateSlug = '',
	templates = [],
	currentState = {},
} = {}) {
	const wanted = String(templateSlug ?? '').trim()
	if (wanted === '') {
		return { ...currentState }
	}

	const template = templates.find((entry) => String(entry?.slug ?? '') === wanted)
	if (!template) {
		// A template that has gone is not a reason to refuse the save. The
		// person still wants the list they are looking at.
		return { ...currentState }
	}

	const started = { ...currentState }
	for (const part of ['columns', 'sorting', 'defaultSort', 'exportFields']) {
		if (template[part] !== undefined && template[part] !== null) {
			started[part] = template[part]
		}
	}

	return started
}
