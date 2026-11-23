/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The wire shape of OpenRegister's merged activity feed, in one place.
 *
 * ASSUMED, NOT MEASURED. The task that builds this (the-activity-tab-reads-the-merged-feed
 * 1.1) is to measure the endpoint on openregister `parity/round2` first; that
 * repository is not here. Every name below is the one the engine's contract
 * implies (`kinds`, `from`, `until`, a time cursor, a count per kind, reads
 * excluded by default). When the measured shape differs, change THIS file; the
 * tab and the tests read the shape only through it. A server that answers 404,
 * 405 or 501 makes the tab fall back to the single-source Activity endpoint it
 * read before, so a wrong guess degrades to today's tab rather than a blank one.
 *
 * @module integrations/builtin/activity/activityFeedWire
 * @spec openspec/changes/the-activity-tab-reads-the-merged-feed/tasks.md#task-1
 */

/** The kinds of row the merged feed holds. */
export const ACTIVITY_FEED_KINDS = Object.freeze(['audit', 'activity', 'file', 'note', 'mail'])

/**
 * @param {{apiBase: string, register: string, schema: string, objectId: string}} object The object.
 * @return {string} The merged feed's path (before the query).
 */
export function feedPath({ apiBase, register, schema, objectId }) {
	return `${apiBase}/objects/${register}/${schema}/${objectId}/activity-feed`
}

/**
 * The query for one page of the merged feed.
 *
 * @param {object} filters What the tab shows.
 * @param {string[]} [filters.kinds] Kinds to show; empty = all.
 * @param {string} [filters.from] ISO time lower bound.
 * @param {string} [filters.until] ISO time upper bound.
 * @param {boolean} [filters.reads] Include read entries (excluded by default).
 * @param {string} [filters.actor] Only this actor.
 * @param {string} [filters.visibility] `internal` or `public`.
 * @param {string|number|null} [filters.cursor] The time cursor of the last page.
 * @param {number} [filters.limit] Page size.
 * @return {string} A query string without the leading `?`.
 */
export function feedQuery({ kinds = [], from = '', until = '', reads = false, actor = '', visibility = '', cursor = null, limit = 25 } = {}) {
	const params = new URLSearchParams()
	params.set('limit', String(limit))
	if (kinds.length > 0) {
		params.set('kinds', kinds.join(','))
	}
	if (from) {
		params.set('from', from)
	}
	if (until) {
		params.set('until', until)
	}
	if (reads) {
		params.set('reads', '1')
	}
	if (actor) {
		params.set('actor', actor)
	}
	if (visibility) {
		params.set('visibility', visibility)
	}
	if (cursor !== null && cursor !== undefined && cursor !== '') {
		params.set('cursor', String(cursor))
	}
	return params.toString()
}

/**
 * Read a page of the merged feed.
 *
 * @param {object} data The response body.
 * @return {{rows: object[], cursor: (string|number|null), counts: Object<string, number>}} The rows, the cursor of the next page (null at the end) and the count per kind.
 */
export function parseFeed(data) {
	const body = data && typeof data === 'object' ? data : {}
	const rows = body.results || body.items || (Array.isArray(data) ? data : []) || []
	const next = body.cursor ?? body.nextCursor ?? null
	const counts = {}
	for (const [kind, n] of Object.entries(body.counts || body.kindCounts || {})) {
		counts[kind] = Number(n) || 0
	}
	return { rows, cursor: next === undefined || next === '' ? null : next, counts }
}

/**
 * Whether a row is a read. Only an audit row can be one: a note whose action
 * happens to be spelled `read` is still a note.
 *
 * @param {object} row A feed row.
 * @return {boolean} True for an audit read.
 */
export function isReadRow(row) {
	return !!row && row.kind === 'audit' && String(row.action || '').toLowerCase() === 'read'
}

/**
 * The body of the export request: the rows on screen and the filters that
 * produced them. The server writes exactly these rows; it queries nothing.
 *
 * @param {object[]} rows The rows the tab shows.
 * @param {object} filters The filters the tab shows (see `feedQuery`, without the cursor).
 * @return {{rows: object[], filters: object}} The request body.
 */
export function exportBody(rows, filters) {
	const { cursor, ...shown } = filters
	return { rows, filters: shown }
}
