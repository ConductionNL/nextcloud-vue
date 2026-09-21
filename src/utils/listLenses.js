/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * The filter token a lens uses to mean "the teams this person claimed".
 *
 * @type {string}
 */
export const MY_TEAMS_TOKEN = '@myTeams'

/**
 * The filter token a lens uses to mean "the subjects this person claimed".
 *
 * @type {string}
 */
export const MY_SUBJECTS_TOKEN = '@mySubjects'

/**
 * The id of a saved view, in either spelling OpenRegister answers with.
 *
 * @param {object} view A saved view.
 * @return {string} The id, or ''.
 */
export function viewIdOf(view) {
	if (!view || typeof view !== 'object') {
		return ''
	}
	if (view.id !== undefined && view.id !== null && view.id !== '') {
		return String(view.id)
	}
	return view.uuid !== undefined && view.uuid !== null ? String(view.uuid) : ''
}

/**
 * Split a page's saved views into the ones it named as tabs and the ones that
 * stay in the views control.
 *
 * Which side wins on what:
 *
 * - The VIEWS decide membership. A tab exists only because a view exists; a
 *   `tabIds` entry naming a view that is gone produces no tab, rather than a
 *   tab that opens nothing.
 * - The PAGE decides presentation. `tabIds` is the tab order, and a view named
 *   there is removed from the control, so the same lens is never offered in
 *   two places at once. Opening one of two entries that do the same thing is
 *   how a person learns a page is lying to them about what it has.
 *
 * @param {Array<object>} views The page's saved views.
 * @param {Array<string>} tabIds The view ids the page names as tabs, in order.
 * @return {{tabs: Array<object>, control: Array<object>}}
 */
export function splitViewsIntoTabs(views, tabIds) {
	const all = Array.isArray(views) ? views : []
	const wanted = Array.isArray(tabIds) ? tabIds.map(String) : []
	if (wanted.length === 0) {
		return { tabs: [], control: all }
	}
	const byId = new Map(all.map((view) => [viewIdOf(view), view]))
	const tabs = []
	const claimed = new Set()
	wanted.forEach((id) => {
		const view = byId.get(id)
		if (view && !claimed.has(id)) {
			tabs.push(view)
			claimed.add(id)
		}
	})
	return { tabs, control: all.filter((view) => !claimed.has(viewIdOf(view))) }
}

/**
 * One saved view as a tab for CnQuickFilterBar, so a lens renders through the
 * tab strip the page already has rather than a second one beside it.
 *
 * @param {object} view A saved view.
 * @return {{id: string, label: string, filter: object}}
 */
export function viewAsTab(view) {
	return {
		id: viewIdOf(view),
		label: (view && (view.title || view.name)) || viewIdOf(view),
		filter: (view && (view.filters || view.filter)) || {},
	}
}

/**
 * The teams this person is treated as having claimed.
 *
 * The instance decides membership: `offered` is the set of teams this person
 * may claim at all. The person decides which of those they claim, and their
 * stored answer is read by walking `offered`, so a team they claimed before it
 * was taken away from them is passed over rather than honoured. A preference
 * is a choice among what exists; it is not a second place a membership can be
 * granted.
 *
 * A stored value that is not a list is someone who has never chosen, which
 * claims nothing.
 *
 * @param {Array<string|object>} offered The teams this person may claim.
 * @param {(Array<string>|null|undefined)} stored The teams they stored.
 * @return {string[]} The claimed team ids, in the offered order.
 */
export function resolveClaimedTeams(offered, stored) {
	const available = (Array.isArray(offered) ? offered : [])
		.map((team) => (typeof team === 'string' ? team : (team && team.id !== undefined ? String(team.id) : '')))
		.filter((id) => id !== '')
	if (!Array.isArray(stored)) {
		return []
	}
	const wanted = new Set(stored.map(String))
	return available.filter((id) => wanted.has(id))
}

/**
 * Resolve the claimed-teams and claimed-subjects tokens inside a lens filter.
 *
 * A lens that says "my teams" and then shows every team would be a label
 * stating one rule while the fetch ran another. So an unresolved token narrows
 * to nothing and says so through `narrowsToNothing`, and the page can tell the
 * person they have claimed no teams rather than hand them the whole list under
 * a heading that says otherwise.
 *
 * @param {object} filter The lens filter.
 * @param {object} claims The person's claims.
 * @param {string[]} [claims.teams] The claimed team ids.
 * @param {string[]} [claims.subjects] The claimed subject ids.
 * @return {{filter: object, narrowsToNothing: boolean, tokens: string[]}}
 */
export function resolveClaimTokens(filter, { teams = [], subjects = [] } = {}) {
	const source = filter && typeof filter === 'object' ? filter : {}
	const out = {}
	const tokens = []
	let narrowsToNothing = false
	Object.entries(source).forEach(([key, value]) => {
		if (value === MY_TEAMS_TOKEN || value === MY_SUBJECTS_TOKEN) {
			const claimed = value === MY_TEAMS_TOKEN ? teams : subjects
			tokens.push(value)
			out[key] = [...claimed]
			if (claimed.length === 0) {
				narrowsToNothing = true
			}
			return
		}
		out[key] = value
	})
	return { filter: out, narrowsToNothing, tokens }
}

/**
 * A navigation entry per record type, with the count the list confirmed.
 *
 * A count nobody confirmed is left off the entry rather than shown as the last
 * one anybody saw. A stale number beside a list is worse than no number: it is
 * read as fact and acted on, and nothing on the screen says how old it is.
 *
 * @param {Array<object>} types The declared record types: `{ id, label, page }`.
 * @param {object} counts The counts by type id. A type absent from this map, or
 *   carrying a value that is not a finite number, gets no count.
 * @return {Array<{id: string, label: string, page: string, count: (number|null)}>}
 */
export function recordTypeNavEntries(types, counts = {}) {
	const declared = Array.isArray(types) ? types : []
	const confirmed = counts && typeof counts === 'object' ? counts : {}
	return declared
		.filter((type) => type && typeof type.id === 'string' && type.id !== '')
		.map((type) => {
			const raw = confirmed[type.id]
			const count = typeof raw === 'number' && Number.isFinite(raw) ? raw : null
			return {
				id: type.id,
				label: type.label || type.id,
				page: type.page || type.id,
				count,
			}
		})
}
