/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * pageControls: how a list widget listens to the page's controls.
 *
 * A page control (a `workspace-filter` select or switch) writes a value to the
 * page workspace. A list widget declares which control it listens to and what
 * the value means for it:
 *
 *   pageControls: {
 *     sort:   { key: "sort", map: { deadline: { field: "slaDeadline", dir: "asc" } } },
 *     toggle: { key: "showDone", removes: ["status"] }
 *   }
 *
 * `sort`: the workspace value at `key` picks an entry of `map` (the sort the
 * list uses); a value with no entry leaves the list's own sort.
 * `toggle`: while the workspace value at `key` is on (true, "1", "true"), the
 * filter keys in `removes` are dropped, so a list that hides finished work
 * shows it.
 *
 * @module utils/pageControls
 */

/**
 * Whether a workspace value reads as on.
 *
 * @param {unknown} value The value.
 * @return {boolean} True for true, 1, "1" and "true".
 */
export function isOn(value) {
	return value === true || value === 1 || value === '1' || value === 'true'
}

/**
 * The sort a list uses once the page's sort control is read.
 *
 * @param {object|null} pageControls The widget's `pageControls`.
 * @param {object} workspace The plain workspace bag.
 * @param {{field: string, dir?: string}|null} own The list's own sort.
 * @return {{field: string, dir?: string}|null} The sort to use.
 * @spec openspec/changes/screens-page-controls/specs/page-controls/spec.md#requirement-a-list-listens-to-the-pages-controls
 */
export function pageSort(pageControls, workspace, own) {
	const listen = pageControls && typeof pageControls === 'object' ? pageControls.sort : null
	if (!listen || typeof listen.key !== 'string' || !listen.map || typeof listen.map !== 'object') {
		return own
	}
	const chosen = workspace ? workspace[listen.key] : undefined
	const entry = chosen !== undefined && chosen !== null ? listen.map[String(chosen)] : null
	return entry && typeof entry === 'object' && typeof entry.field === 'string' && entry.field !== '' ? entry : own
}

/**
 * The filter a list uses once the page's toggle is read: with the toggle on,
 * the keys it `removes` are gone.
 *
 * @param {object|null} pageControls The widget's `pageControls`.
 * @param {object} workspace The plain workspace bag.
 * @param {object} filter The list's own filter (before token resolution).
 * @return {object} The filter to use (the same object when nothing is removed).
 * @spec openspec/changes/screens-page-controls/specs/page-controls/spec.md#requirement-a-list-listens-to-the-pages-controls
 */
export function pageFilter(pageControls, workspace, filter) {
	const listen = pageControls && typeof pageControls === 'object' ? pageControls.toggle : null
	const base = filter && typeof filter === 'object' ? filter : {}
	if (!listen || typeof listen.key !== 'string' || !Array.isArray(listen.removes)) {
		return base
	}
	if (!isOn(workspace ? workspace[listen.key] : undefined)) {
		return base
	}
	const out = { ...base }
	for (const key of listen.removes) {
		delete out[key]
	}
	return out
}
