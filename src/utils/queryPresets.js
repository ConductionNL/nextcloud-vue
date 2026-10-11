/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Query presets of an index page (`config.queryPresets`): a menu entry that
 * deep-links to a list with a query (`{ caseType: '<uuid>' }`, the shape hydra
 * gate-68 asks for instead of a second page) can bring its own lenses,
 * columns and copy. The page names, per preset, the query it answers to and
 * the keys it replaces; the first preset whose every `match` pair is in the
 * current route query wins.
 *
 * @module utils/queryPresets
 * @spec openspec/changes/screens-index-query-presets/specs/index-query-presets/spec.md#requirement-a-query-preset-overlays-lenses-columns-and-copy
 */

/**
 * The config keys a preset may replace. Anything else in a preset is ignored:
 * a preset changes what the list shows, never which register or schema it
 * reads or what it may write.
 *
 * @type {ReadonlyArray<string>}
 */
export const QUERY_PRESET_KEYS = Object.freeze([
	'title',
	'quickFilters',
	'columns',
	'cardFields',
	'countText',
	'searchPlaceholder',
	'footerNote',
	'defaultSort',
	'viewSwitch',
])

/**
 * Whether one route query value satisfies one `match` value. A repeated query
 * parameter (an array) matches when it holds the value.
 *
 * @param {unknown} actual The route query value.
 * @param {string|number|boolean} expected The preset's value.
 * @return {boolean} True when they match.
 */
function queryValueMatches(actual, expected) {
	const want = String(expected)
	if (Array.isArray(actual)) {
		return actual.some((v) => String(v) === want)
	}
	return actual !== undefined && actual !== null && String(actual) === want
}

/**
 * The index of the first preset whose every `match` pair is in the query.
 * A preset without a non-empty `match` never matches.
 *
 * @param {Array<object>} presets The page's `queryPresets`.
 * @param {object} query The current route query.
 * @return {number} The preset index, or -1.
 */
export function matchQueryPreset(presets, query) {
	if (!Array.isArray(presets)) {
		return -1
	}
	const q = query && typeof query === 'object' ? query : {}
	return presets.findIndex((preset) => {
		const match = preset && typeof preset.match === 'object' && preset.match !== null ? preset.match : null
		if (!match || Object.keys(match).length === 0) {
			return false
		}
		return Object.entries(match).every(([key, value]) => queryValueMatches(q[key], value))
	})
}

/**
 * The page config with the preset's allowed keys laid over it, and without
 * `queryPresets` itself (the page component has no such prop).
 *
 * @param {object} config The page config.
 * @param {object|null} preset The matched preset, or null.
 * @return {object} The effective config.
 */
export function applyQueryPreset(config, preset) {
	const { queryPresets, ...rest } = config || {}
	if (!preset || typeof preset !== 'object') {
		return rest
	}
	const out = { ...rest }
	for (const key of QUERY_PRESET_KEYS) {
		if (key !== 'title' && preset[key] !== undefined) {
			out[key] = preset[key]
		}
	}
	return out
}
